import type { PublicClient, TestClient } from 'viem'
import { erc20Abi } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  type ArbiterClient,
  createArbiterClient,
  createMerchantClient,
  createPayerClient,
  createX402r,
  type MerchantClient,
  type PayerClient,
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

const baseSepolia = x402rChains[84532]

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let facilitator: X402r
let payer: PayerClient
let merchant: MerchantClient
let arbiter: ArbiterClient

const REFUND_AMOUNT = 600_000n

let paymentInfo: PaymentInfo
let payerBalanceBefore: bigint

beforeAll(async () => {
  ;({ publicClient, testClient, fixtures, paymentInfo } = await setupScenario({
    salt: 8n,
    operator: 'arbiterRefund',
  }))

  // Use arbiterRefundOperator — refundInEscrow gated by StaticAddressCondition(refundRequest)
  facilitator = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.arbiterRefundOperatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
  })

  payer = createPayerClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.arbiterRefundOperatorAddress,
    refundRequestAddress: fixtures.refundRequestAddress,
  })

  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress: fixtures.arbiterRefundOperatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
  })

  arbiter = createArbiterClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.arbiter.address),
    operatorAddress: fixtures.arbiterRefundOperatorAddress,
    refundRequestAddress: fixtures.refundRequestAddress,
  })
}, 60_000)

// ---------------------------------------------------------------------------
// Scenario 8: Partial in-escrow refund via partial-capture + void remainder
//   (RefundRequest hook auto-approves on void — Flow 7a)
// ---------------------------------------------------------------------------

describe('Scenario 8: Partial in-escrow refund via partial-capture + void', () => {
  it('authorize creates a payment in escrow', async () => {
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo,
    )
    const hash = await facilitator.payment.authorize(
      paymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await payer.payment.getAmounts(paymentInfo)
    expect(amounts.capturableAmount).toBeGreaterThan(0n)

    // Record payer balance before refund for later assertion
    payerBalanceBefore = await publicClient.readContract({
      address: baseSepolia.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
  }, 60_000)

  it('payer requests refund', async () => {
    const hash = await payer.refund!.request(paymentInfo, REFUND_AMOUNT)
    await publicClient.waitForTransactionReceipt({ hash })

    const status = await arbiter.refund!.getStatus(paymentInfo)
    // Pending = 0
    expect(status).toBe(0)
  }, 60_000)

  it('merchant captures the keep-amount, then voids remainder — hook auto-approves', async () => {
    // The new authCapture surface drops partial in-escrow refund. Replacement
    // is partial capture: capture only what the merchant keeps, then void the
    // remainder back to the payer. The RefundRequest hook (wired as
    // voidPostActionHook on this operator) auto-approves the pending request
    // as part of the void transaction. No separate approve step.
    const merchantWithRefund = createMerchantClient({
      publicClient,
      walletClient: anvilBaseSepolia.getWalletClient(
        testRoles.receiver.address,
      ),
      operatorAddress: fixtures.arbiterRefundOperatorAddress,
      escrowPeriodAddress: fixtures.escrowPeriodAddress,
      refundRequestAddress: fixtures.refundRequestAddress,
      refundRequestEvidenceAddress: fixtures.refundRequestEvidenceAddress,
    })

    // Capture is gated by capturePreActionCondition (EscrowPeriod) on the
    // arbiterRefund operator — fast-forward past escrow before partial capture.
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    // 1. Merchant captures the keep-amount (DEFAULT_AMOUNT - REFUND_AMOUNT)
    const captureHash = await merchant.payment.capture(
      paymentInfo,
      DEFAULT_AMOUNT - REFUND_AMOUNT,
      '0x',
    )
    await publicClient.waitForTransactionReceipt({ hash: captureHash })

    // After partial capture, REFUND_AMOUNT remains in capturable
    const amountsAfterCapture =
      await merchantWithRefund.payment.getAmounts(paymentInfo)
    expect(amountsAfterCapture.capturableAmount).toBe(REFUND_AMOUNT)

    // 2. Merchant voids the remainder — RefundRequest hook auto-approves
    const voidHash = await merchantWithRefund.payment.voidPayment(paymentInfo)
    await publicClient.waitForTransactionReceipt({ hash: voidHash })

    const status = await arbiter.refund!.getStatus(paymentInfo)
    // Approved = 1
    expect(status).toBe(1)

    const request = await arbiter.refund!.get(paymentInfo)
    expect(request.approvedAmount).toBe(REFUND_AMOUNT)

    // Verify payer USDC balance increased by REFUND_AMOUNT (the voided remainder)
    const payerBalanceAfter = await publicClient.readContract({
      address: baseSepolia.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
    expect(payerBalanceAfter - payerBalanceBefore).toBe(REFUND_AMOUNT)

    // Capturable === 0 after void
    const finalAmounts =
      await merchantWithRefund.payment.getAmounts(paymentInfo)
    expect(finalAmounts.capturableAmount).toBe(0n)
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Scenario 8b: Merchant directly calls voidPayment (no request needed for
// merchant-initiated refund — hook still records the approval)
// ---------------------------------------------------------------------------

describe('Scenario 8b: Merchant voidPayment without prior request', () => {
  let paymentInfo2: PaymentInfo
  let payerBalance2Before: bigint

  beforeAll(async () => {
    // Reuse fixtures but create a fresh payment with a different salt
    const scenario2 = await setupScenario({
      salt: 9n,
      operator: 'arbiterRefund',
    })
    paymentInfo2 = scenario2.paymentInfo
  }, 60_000)

  it('authorize creates a payment in escrow', async () => {
    const facilitator2 = createX402r({
      publicClient,
      walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      operatorAddress: fixtures.arbiterRefundOperatorAddress,
      escrowPeriodAddress: fixtures.escrowPeriodAddress,
    })

    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo2,
    )
    const hash = await facilitator2.payment.authorize(
      paymentInfo2,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    payerBalance2Before = await publicClient.readContract({
      address: baseSepolia.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
  }, 60_000)

  it('payer requests refund', async () => {
    const hash = await payer.refund!.request(paymentInfo2, REFUND_AMOUNT)
    await publicClient.waitForTransactionReceipt({ hash })

    const status = await arbiter.refund!.getStatus(paymentInfo2)
    expect(status).toBe(0) // Pending
  }, 60_000)

  it('merchant calls voidPayment — funds returned atomically from escrow', async () => {
    const merchantWithRefund = createMerchantClient({
      publicClient,
      walletClient: anvilBaseSepolia.getWalletClient(
        testRoles.receiver.address,
      ),
      operatorAddress: fixtures.arbiterRefundOperatorAddress,
      escrowPeriodAddress: fixtures.escrowPeriodAddress,
      refundRequestAddress: fixtures.refundRequestAddress,
      refundRequestEvidenceAddress: fixtures.refundRequestEvidenceAddress,
    })

    const hash = await merchantWithRefund.payment.voidPayment(paymentInfo2)
    await publicClient.waitForTransactionReceipt({ hash })

    const status = await arbiter.refund!.getStatus(paymentInfo2)
    expect(status).toBe(1) // Approved

    // voidPayment is full-only — empties the entire authorization, returning
    // DEFAULT_AMOUNT to the payer (not just REFUND_AMOUNT).
    const payerBalance2After = await publicClient.readContract({
      address: baseSepolia.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
    expect(payerBalance2After - payerBalance2Before).toBe(DEFAULT_AMOUNT)
  }, 60_000)
})

// Scenario 8c (deleted): the old test asserted refundInEscrow reverts after
// escrow expires (time-gated). The new voidPayment surface is gated by
// voidPreActionCondition = ReceiverCondition on this arbiterRefund operator,
// not by escrow timing — receiver can void at any time. The original
// time-gating semantics no longer exist, so the test is obsolete. Post-
// capture refund mechanics are covered by post-capture-refund.fork.test.ts.
