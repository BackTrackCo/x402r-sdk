import type { PublicClient, TestClient } from 'viem'
import { erc20Abi, parseEther, parseEventLogs } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  createMerchantClient,
  createX402r,
  type MerchantClient,
  type X402r,
} from '../../../sdk/src/index.js'
import {
  paymentOperatorAbi,
  protocolFeeConfigAbi,
} from '../../src/abis/generated.js'
import { x402rChains } from '../../src/config/index.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import {
  DEFAULT_AMOUNT,
  ESCROW_FAST_FORWARD,
  testRoles,
} from '../setup/constants.js'
import type { DeployedFixtures } from '../setup/deploy-fixtures.js'
import { createCollectorData } from '../setup/erc3009-helper.js'
import { setupScenario } from '../setup/scenario-helper.js'

// ---------------------------------------------------------------------------
// Scenario: Protocol-Fee Distribution
//   Closes a coverage gap: no other fork test exercises distributeFees.
//
//   The default fork has ProtocolFeeConfig.calculator() == address(0), so a
//   capture accrues ZERO protocol fees. beforeAll therefore installs the
//   test StaticFeeCalculator (50 bps) onto the canonical ProtocolFeeConfig
//   via the timelocked queue/execute flow (impersonating its owner) so the
//   capture below accrues a nonzero protocol fee.
//
//   capture → protocol fees accrue (recipient unpaid) →
//   distributeFees pays the protocol recipient → accrued resets to 0 →
//   FeesDistributed event matches the accrued amount.
// ---------------------------------------------------------------------------

const protocolFeeConfig = x402rChains[84532].protocolFeeConfig
// Owner AND protocol-fee recipient of the canonical ProtocolFeeConfig.
const PFC_OWNER = '0x773dBcB5BDb3Df8359ba4e42D7Ce7AE3fC9Ee235' as const
// ProtocolFeeConfig.TIMELOCK_DELAY (7 days) + 1 second.
const TIMELOCK_FAST_FORWARD = 604801

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let payerClient: X402r
let merchant: MerchantClient

let paymentInfo: PaymentInfo
let accruedProtocolFees: bigint

const readBalance = (owner: `0x${string}`) =>
  publicClient.readContract({
    address: paymentInfo.token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [owner],
  })

beforeAll(async () => {
  ;({ publicClient, testClient, fixtures, paymentInfo } = await setupScenario({
    salt: 25n,
  }))

  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.operatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
  })

  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress: fixtures.operatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
  })

  // Install the test StaticFeeCalculator (50 bps) onto the canonical
  // ProtocolFeeConfig. Without this the calculator is address(0) and the
  // capture accrues zero protocol fees, so distributeFees has nothing to pay.
  await testClient.setBalance({ address: PFC_OWNER, value: parseEther('1') })
  await testClient.impersonateAccount({ address: PFC_OWNER })

  const ownerWallet = anvilBaseSepolia.getWalletClient(PFC_OWNER)

  const queueHash = await ownerWallet.writeContract({
    address: protocolFeeConfig,
    abi: protocolFeeConfigAbi,
    functionName: 'queueCalculator',
    args: [fixtures.feeCalculatorAddress],
    account: PFC_OWNER,
    chain: ownerWallet.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: queueHash })

  // The calculator change is timelocked; fast-forward past the delay.
  await testClient.increaseTime({ seconds: TIMELOCK_FAST_FORWARD })
  await testClient.mine({ blocks: 1 })

  const executeHash = await ownerWallet.writeContract({
    address: protocolFeeConfig,
    abi: protocolFeeConfigAbi,
    functionName: 'executeCalculator',
    args: [],
    account: PFC_OWNER,
    chain: ownerWallet.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: executeHash })

  await testClient.stopImpersonatingAccount({ address: PFC_OWNER })

  // Sanity: the protocol calculator is now the test fee calculator.
  const installedCalculator = await publicClient.readContract({
    address: protocolFeeConfig,
    abi: protocolFeeConfigAbi,
    functionName: 'calculator',
  })
  expect(installedCalculator.toLowerCase()).toBe(
    fixtures.feeCalculatorAddress.toLowerCase(),
  )
}, 60_000)

describe('Protocol-Fee Distribution', () => {
  // Step 1 — a capture accrues a nonzero protocol fee that is held by the
  // operator contract until distributeFees is called.
  it('capture accrues nonzero protocol fees, recipient unpaid', async () => {
    const recipient = await publicClient.readContract({
      address: protocolFeeConfig,
      abi: protocolFeeConfigAbi,
      functionName: 'getProtocolFeeRecipient',
    })
    const recipientBefore = await readBalance(recipient)

    // Authorize into escrow.
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo,
    )
    const authHash = await payerClient.payment.authorize(
      paymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash: authHash })

    // Capture after the escrow window expires.
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    const captureHash = await merchant.payment.capture(
      paymentInfo,
      DEFAULT_AMOUNT,
      '0x',
    )
    await publicClient.waitForTransactionReceipt({ hash: captureHash })

    accruedProtocolFees = await merchant.operator.getAccumulatedProtocolFees(
      paymentInfo.token,
    )

    // 50 bps of 1 USDC (1_000_000) = 5000.
    expect(accruedProtocolFees).toBe(5000n)

    // The protocol recipient must NOT have been paid yet — fees only move on
    // distributeFees.
    const recipientAfter = await readBalance(recipient)
    expect(recipientAfter).toBe(recipientBefore)
  }, 60_000)

  // Step 2 — distributeFees pays the protocol recipient the full accrued
  // amount, resets the accrued counter, and emits FeesDistributed.
  it('distributeFees pays the protocol recipient and resets accrued to 0', async () => {
    // Guard: depends on Step 1 having accrued a nonzero amount.
    expect(accruedProtocolFees).toBeGreaterThan(0n)

    const recipient = await publicClient.readContract({
      address: protocolFeeConfig,
      abi: protocolFeeConfigAbi,
      functionName: 'getProtocolFeeRecipient',
    })
    const recipientBefore = await readBalance(recipient)

    const distributeHash = await merchant.operator.distributeFees(
      paymentInfo.token,
    )
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: distributeHash,
    })

    // The recipient delta equals exactly the accrued amount.
    const recipientAfter = await readBalance(recipient)
    expect(recipientAfter - recipientBefore).toBe(accruedProtocolFees)

    // Accrued resets to zero after distribution.
    const accruedAfter = await merchant.operator.getAccumulatedProtocolFees(
      paymentInfo.token,
    )
    expect(accruedAfter).toBe(0n)

    // FeesDistributed reports the token and the distributed protocol amount.
    const logs = parseEventLogs({
      abi: paymentOperatorAbi,
      eventName: 'FeesDistributed',
      logs: receipt.logs,
    })
    expect(logs).toHaveLength(1)
    expect(logs[0].args.token.toLowerCase()).toBe(
      paymentInfo.token.toLowerCase(),
    )
    expect(logs[0].args.protocolAmount).toBe(accruedProtocolFees)
  }, 60_000)
})
