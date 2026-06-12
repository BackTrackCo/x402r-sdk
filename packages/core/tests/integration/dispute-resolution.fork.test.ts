import type { PublicClient } from 'viem'
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
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import { DEFAULT_AMOUNT, testRoles } from '../setup/constants.js'
import type { DeployedFixtures } from '../setup/deploy-fixtures.js'
import { createCollectorData } from '../setup/erc3009-helper.js'
import { setupScenario } from '../setup/scenario-helper.js'

// ---------------------------------------------------------------------------
// Scenario: Dispute Resolution (3-role full lifecycle)
//
// authorize → payer requests refund → payer + merchant submit evidence →
// arbiter reviews evidence → merchant executes voidPayment (RefundRequest hook
// auto-approves) → verify full refund (payer net-zero, receiver + feeReceiver
// unchanged) → verify zero protocol fees accrue.
//
// arbiterRefund operator: voidPostActionHook = RefundRequest, so the merchant's
// voidPayment auto-approves the pending request in the same transaction. A full
// void returns 100% of escrow to the payer and collects zero protocol fees.
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let fixtures: DeployedFixtures
let facilitator: X402r
let payer: PayerClient
let merchant: MerchantClient
let arbiter: ArbiterClient

let paymentInfo: PaymentInfo
let payerBalanceBefore: bigint
let receiverBalanceBefore: bigint
let feeReceiverBalanceBefore: bigint

const readBalance = (owner: `0x${string}`) =>
  publicClient.readContract({
    address: paymentInfo.token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [owner],
  })

beforeAll(async () => {
  ;({ publicClient, fixtures, paymentInfo } = await setupScenario({
    salt: 24n,
    operator: 'arbiterRefund',
  }))

  // Facilitator authorizes (payer wallet signs the ERC-3009 collectorData).
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
    refundRequestEvidenceAddress: fixtures.refundRequestEvidenceAddress,
  })

  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress: fixtures.arbiterRefundOperatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
    refundRequestAddress: fixtures.refundRequestAddress,
    refundRequestEvidenceAddress: fixtures.refundRequestEvidenceAddress,
  })

  arbiter = createArbiterClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.arbiter.address),
    operatorAddress: fixtures.arbiterRefundOperatorAddress,
    refundRequestAddress: fixtures.refundRequestAddress,
    refundRequestEvidenceAddress: fixtures.refundRequestEvidenceAddress,
  })

  // Snapshot the three settlement balances before any state change. Under a
  // full refund the payer must net-zero (pays DEFAULT_AMOUNT on authorize,
  // receives it back on void) and receiver + feeReceiver must not move at all.
  payerBalanceBefore = await readBalance(testRoles.payer.address)
  receiverBalanceBefore = await readBalance(testRoles.receiver.address)
  feeReceiverBalanceBefore = await readBalance(paymentInfo.feeReceiver)
}, 60_000)

describe('Dispute Resolution', () => {
  // Step 1 — authorize payment into escrow.
  it('authorize collects the payment into escrow', async () => {
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

    // hasCollectedPayment is the load-bearing gate: it prevents the later
    // payer net-zero delta check from vacuously passing on a silent authorize
    // failure (no tokens moved → before === after → delta === 0 either way).
    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.hasCollectedPayment).toBe(true)
    expect(amounts.capturableAmount).toBe(DEFAULT_AMOUNT)
  }, 60_000)

  // Step 2 — payer requests a full refund.
  it('payer requests a full refund', async () => {
    const hash = await payer.refund!.request(paymentInfo, DEFAULT_AMOUNT)
    await publicClient.waitForTransactionReceipt({ hash })

    const request = await payer.refund!.get(paymentInfo)
    expect(request.amount).toBe(DEFAULT_AMOUNT)
    // Pending = 0
    expect(request.status).toBe(0)
  }, 60_000)

  // Step 3 — payer and merchant each submit evidence.
  it('payer and merchant submit evidence', async () => {
    const payerEvHash = await payer.evidence!.submit(
      paymentInfo,
      'QmPayerEvidence_receipt',
    )
    await publicClient.waitForTransactionReceipt({ hash: payerEvHash })

    const payerEntry = await payer.evidence!.get(paymentInfo, 0n)
    expect(payerEntry.submitter.toLowerCase()).toBe(
      testRoles.payer.address.toLowerCase(),
    )

    const merchantEvHash = await merchant.evidence!.submit(
      paymentInfo,
      'QmMerchantEvidence_delivery',
    )
    await publicClient.waitForTransactionReceipt({ hash: merchantEvHash })

    const merchantEntry = await merchant.evidence!.get(paymentInfo, 1n)
    expect(merchantEntry.submitter.toLowerCase()).toBe(
      testRoles.receiver.address.toLowerCase(),
    )
  }, 60_000)

  // Step 4 — arbiter reviews the submitted evidence.
  it('arbiter reads the full evidence batch', async () => {
    const count = await arbiter.evidence!.count(paymentInfo)
    expect(count).toBe(2n)

    const batch = await arbiter.evidence!.getBatch(paymentInfo, 0n, count)
    expect(batch.entries).toHaveLength(2)
  }, 60_000)

  // Step 5 — merchant voids the payment; RefundRequest hook auto-approves.
  it('merchant voidPayment auto-approves the refund', async () => {
    // voidPayment empties the entire authorization in one transaction
    // (escrow.void is full-only). The RefundRequest hook (wired as
    // voidPostActionHook on the arbiterRefund operator) auto-approves the
    // pending request as part of the void — no separate approve step.
    const hash = await merchant.payment.voidPayment(paymentInfo)
    await publicClient.waitForTransactionReceipt({ hash })

    const request = await merchant.refund!.get(paymentInfo)
    expect(request.approvedAmount).toBe(DEFAULT_AMOUNT)
    // Approved = 1
    expect(request.status).toBe(1)
  }, 60_000)

  // Step 6 — verify refund amounts and settlement balances.
  it('settles a full refund: payer net-zero, receiver + feeReceiver unchanged', async () => {
    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.refundableAmount).toBe(0n)

    // Net-zero invariant: payer paid DEFAULT_AMOUNT on authorize and got it
    // back on full refund. A non-zero delta means tokens never moved back.
    const payerBalanceAfter = await readBalance(testRoles.payer.address)
    expect(payerBalanceAfter).toBe(payerBalanceBefore)

    // Receiver + feeReceiver must not have moved at all under a full refund.
    // Distinct from the payer net-zero check: the payer can net-zero even if
    // tokens were misrouted (paid out then refunded back). These deltas pin
    // the destinations explicitly.
    const receiverBalanceAfter = await readBalance(testRoles.receiver.address)
    const feeReceiverBalanceAfter = await readBalance(paymentInfo.feeReceiver)
    expect(receiverBalanceAfter).toBe(receiverBalanceBefore)
    expect(feeReceiverBalanceAfter).toBe(feeReceiverBalanceBefore)
  }, 60_000)

  // Step 7 — a full refund collects zero protocol fees.
  it('accrues zero protocol fees under a full refund', async () => {
    const accumulatedFees = await merchant.operator.getAccumulatedProtocolFees(
      paymentInfo.token,
    )
    expect(accumulatedFees).toBe(0n)
  }, 60_000)
})
