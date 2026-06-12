import type { PublicClient, TestClient } from 'viem'
import { erc20Abi } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  createMerchantClient,
  createX402r,
  type MerchantClient,
  type X402r,
} from '../../../sdk/src/index.js'
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
// Scenario: Partial Refund Flow (converted from examples/scenarios)
//   authorize → fast-forward past escrow → capture(merchantKeep) → voidPayment
//   Asserts real ERC-20 balance deltas: payer recovers remainder,
//   receiver Δ + fee Δ === merchantKeep, fee Δ > 0.
// ---------------------------------------------------------------------------

const MERCHANT_KEEP = (DEFAULT_AMOUNT * 60n) / 100n // 60% kept by merchant

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let payerClient: X402r
let merchant: MerchantClient

let paymentInfo: PaymentInfo

beforeAll(async () => {
  ;({ publicClient, testClient, fixtures, paymentInfo } = await setupScenario({
    salt: 22n,
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

describe('Partial Refund Flow', () => {
  it('authorize → partial capture → void returns remainder with correct balance deltas', async () => {
    const readBalance = (owner: `0x${string}`) =>
      publicClient.readContract({
        address: paymentInfo.token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [owner],
      })

    // Authorize payment via the SDK viem flow
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

    // Fast-forward past escrow period so merchant can capture
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    // Snapshot balances AFTER authorize + fast-forward, BEFORE capture
    const payerBefore = await readBalance(paymentInfo.payer)
    const receiverBefore = await readBalance(paymentInfo.receiver)
    const feeReceiverBefore = await readBalance(paymentInfo.feeReceiver)

    // Merchant captures only MERCHANT_KEEP — the rest stays in escrow
    const captureHash = await merchant.payment.capture(
      paymentInfo,
      MERCHANT_KEEP,
      '0x',
    )
    await publicClient.waitForTransactionReceipt({ hash: captureHash })

    // Void remainder back to payer
    const voidHash = await merchant.payment.voidPayment(paymentInfo)
    await publicClient.waitForTransactionReceipt({ hash: voidHash })

    const payerAfter = await readBalance(paymentInfo.payer)
    const receiverAfter = await readBalance(paymentInfo.receiver)
    const feeReceiverAfter = await readBalance(paymentInfo.feeReceiver)

    const expectedRemainder = DEFAULT_AMOUNT - MERCHANT_KEEP
    const receiverDelta = receiverAfter - receiverBefore
    const feeDelta = feeReceiverAfter - feeReceiverBefore

    expect(payerAfter - payerBefore).toBe(expectedRemainder)
    expect(receiverDelta + feeDelta).toBe(MERCHANT_KEEP)
    expect(feeDelta).toBeGreaterThan(0n)
  }, 60_000)
})
