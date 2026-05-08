import type { PublicClient, TestClient } from 'viem'
import { erc20Abi } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  createMerchantClient,
  createX402r,
  type MerchantClient,
  type X402r,
} from '../../../sdk/src/index.js'
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
// Config
// ---------------------------------------------------------------------------

const baseSepolia = x402rChains[84532]
const USDC = baseSepolia.usdc

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let payerClient: X402r
let merchant: MerchantClient

const REFUND_AMOUNT = 500_000n

let paymentInfo: PaymentInfo

beforeAll(async () => {
  ;({ publicClient, testClient, fixtures, paymentInfo } = await setupScenario({
    salt: 7n,
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
}, 60_000)

// ---------------------------------------------------------------------------
// Scenario 7: Post-capture refund (Flow 4)
// ---------------------------------------------------------------------------

describe('Scenario 7: Post-capture refund (Flow 4)', () => {
  it('authorize and capture payment to receiver', async () => {
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

    // Fast-forward past escrow period
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    const captureHash = await merchant.payment.capture(
      paymentInfo,
      DEFAULT_AMOUNT,
      '0x',
    )
    await publicClient.waitForTransactionReceipt({ hash: captureHash })

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.capturableAmount).toBe(0n)
  }, 60_000)

  it('receiver approves refund allowance for ReceiverRefundCollector', async () => {
    const approveHash = await merchant.payment.approveRefundAllowance(
      USDC,
      REFUND_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash: approveHash })

    const allowance = await merchant.payment.getRefundAllowance(
      USDC,
      testRoles.receiver.address,
    )
    expect(allowance).toBe(REFUND_AMOUNT)
  }, 60_000)

  it('refund transfers funds back to payer via ReceiverRefundCollector', async () => {
    const receiverRefundCollector = baseSepolia.receiverRefundCollector

    const payerBalanceBefore = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })

    const refundHash = await merchant.payment.refund(
      paymentInfo,
      REFUND_AMOUNT,
      receiverRefundCollector,
      '0x',
    )
    await publicClient.waitForTransactionReceipt({ hash: refundHash })

    const payerBalanceAfter = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })

    expect(payerBalanceAfter - payerBalanceBefore).toBe(REFUND_AMOUNT)
  }, 60_000)
})
