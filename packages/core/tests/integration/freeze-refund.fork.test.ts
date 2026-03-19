import type { PublicClient, TestClient } from 'viem'
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
import {
  DEFAULT_AMOUNT,
  ESCROW_FAST_FORWARD,
  testRoles,
} from '../setup/constants.js'
import type { DeployedFixtures } from '../setup/deploy-fixtures.js'
import { createCollectorData } from '../setup/erc3009-helper.js'
import { setupScenario } from '../setup/scenario-helper.js'

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let payerClient: X402r
let receiverClient: X402r
let merchant: MerchantClient
let arbiterClient: ArbiterClient

let paymentInfo: PaymentInfo

beforeAll(async () => {
  ;({ publicClient, testClient, fixtures, paymentInfo } = await setupScenario({
    salt: 4n,
    operator: 'freeze',
  }))

  // Payer client uses the freeze-enabled operator for authorization
  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.operatorWithFreezeAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
    freezeAddress: fixtures.freezeAddress,
  })

  // Full X402r for receiver — needed for refundInEscrow (hidden from MerchantClient)
  receiverClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress: fixtures.operatorWithFreezeAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
    freezeAddress: fixtures.freezeAddress,
  })

  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress: fixtures.operatorWithFreezeAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
    freezeAddress: fixtures.freezeAddress,
  })

  arbiterClient = createArbiterClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.arbiter.address),
    operatorAddress: fixtures.operatorWithFreezeAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
    freezeAddress: fixtures.freezeAddress,
  })
}, 60_000)

// ---------------------------------------------------------------------------
// Scenario 4a: Freeze blocks release, arbiter unfreezes, release succeeds
// ---------------------------------------------------------------------------

describe('Scenario 4a: Freeze → unfreeze → release', () => {
  it('authorize creates capturable payment on freeze-enabled operator', async () => {
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo,
    )
    const hash = await payerClient.payment.authorize(
      paymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.capturableAmount).toBeGreaterThan(0n)
  }, 60_000)

  it('payer freezes payment and isFrozen returns true', async () => {
    const hash = await payerClient.freeze!.freeze(paymentInfo)
    await publicClient.waitForTransactionReceipt({ hash })

    expect(await payerClient.freeze!.isFrozen(paymentInfo)).toBe(true)
  }, 60_000)

  it('release reverts while frozen (even after escrow period)', async () => {
    // Fast-forward past escrow period
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    // EscrowPeriod condition passes, but Freeze condition fails → release reverts
    // Note: JSON-RPC wallet clients on Anvil don't simulate before sending,
    // so writeContract returns a hash even for reverting txs. Check receipt status.
    const hash = await merchant.payment.release(paymentInfo, DEFAULT_AMOUNT)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    expect(receipt.status).toBe('reverted')
  }, 60_000)

  it('arbiter unfreezes and release succeeds', async () => {
    const hash = await arbiterClient.freeze!.unfreeze(paymentInfo)
    await publicClient.waitForTransactionReceipt({ hash })
    expect(await payerClient.freeze!.isFrozen(paymentInfo)).toBe(false)

    // Now release should succeed
    const releaseHash = await merchant.payment.release(
      paymentInfo,
      DEFAULT_AMOUNT,
    )
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: releaseHash,
    })
    expect(receipt.status).toBe('success')
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Scenario 4b: Freeze does not block refundInEscrow
// ---------------------------------------------------------------------------

describe('Scenario 4b: Freeze does not block refundInEscrow', () => {
  // Use a separate paymentInfo (different salt) to avoid state leaking from 4a
  let paymentInfo4b: PaymentInfo

  beforeAll(async () => {
    const scenario = await setupScenario({
      salt: 40n,
      operator: 'freeze',
    })
    paymentInfo4b = scenario.paymentInfo
  }, 60_000)

  it('authorize + freeze + refundInEscrow succeeds while frozen', async () => {
    // Authorize
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo4b,
    )
    const authHash = await payerClient.payment.authorize(
      paymentInfo4b,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash: authHash })

    // Freeze
    const freezeHash = await payerClient.freeze!.freeze(paymentInfo4b)
    await publicClient.waitForTransactionReceipt({ hash: freezeHash })
    expect(await payerClient.freeze!.isFrozen(paymentInfo4b)).toBe(true)

    // refundInEscrow does NOT check freeze — only ReceiverCondition (on this fixture)
    const amountsBefore = await receiverClient.payment.getAmounts(paymentInfo4b)

    const hash = await receiverClient.payment.refundInEscrow(
      paymentInfo4b,
      amountsBefore.capturableAmount,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amountsAfter = await receiverClient.payment.getAmounts(paymentInfo4b)
    expect(amountsAfter.capturableAmount).toBe(0n)
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Scenario 7: Evidence submit → read lifecycle
// ---------------------------------------------------------------------------

describe('Scenario 7: Evidence submit → read lifecycle', () => {
  let paymentInfo7: PaymentInfo
  let payer7: PayerClient
  let arbiter7: ArbiterClient
  let evidenceDeployed = false

  beforeAll(async () => {
    const scenario = await setupScenario({
      salt: 70n,
      operator: 'arbiterRefund',
    })
    paymentInfo7 = scenario.paymentInfo

    // Verify evidence contract was deployed (factory may not exist on older fork blocks)
    const evidenceAddr = scenario.fixtures.refundRequestEvidenceAddress
    const code = await scenario.publicClient.getCode({ address: evidenceAddr })
    if (!code || code === '0x') {
      return // Skip test setup — evidence factory not available on this fork block
    }
    evidenceDeployed = true

    const clientConfig = {
      publicClient: scenario.publicClient,
      operatorAddress: scenario.fixtures.arbiterRefundOperatorAddress,
      escrowPeriodAddress: scenario.fixtures.escrowPeriodAddress,
      refundRequestAddress: scenario.fixtures.refundRequestAddress,
      refundRequestEvidenceAddress: evidenceAddr,
    }

    payer7 = createPayerClient({
      ...clientConfig,
      walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    })

    arbiter7 = createArbiterClient({
      ...clientConfig,
      walletClient: anvilBaseSepolia.getWalletClient(testRoles.arbiter.address),
    })

    // Authorize payment
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo7,
    )
    const fullClient = createX402r({
      ...clientConfig,
      walletClient: anvilBaseSepolia.getWalletClient(
        testRoles.receiver.address,
      ),
    })
    const authHash = await fullClient.payment.authorize(
      paymentInfo7,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await scenario.publicClient.waitForTransactionReceipt({ hash: authHash })
  }, 60_000)

  it('payer requests refund, submits evidence, reads it back', async ({
    skip,
  }) => {
    if (!evidenceDeployed) skip()

    // Request refund
    const requestHash = await payer7.refund!.request(
      paymentInfo7,
      DEFAULT_AMOUNT,
      0n,
    )
    await publicClient.waitForTransactionReceipt({ hash: requestHash })

    // Submit evidence
    const evidenceCid = 'QmTestEvidenceCID_lifecycle'
    const submitHash = await payer7.evidence!.submit(
      paymentInfo7,
      0n,
      evidenceCid,
    )
    await publicClient.waitForTransactionReceipt({ hash: submitHash })

    // Read back evidence
    const count = await payer7.evidence!.count(paymentInfo7, 0n)
    expect(count).toBe(1n)

    const entry = await payer7.evidence!.get(paymentInfo7, 0n, 0n)
    expect(entry.cid).toBe(evidenceCid)
    expect(entry.submitter.toLowerCase()).toBe(
      testRoles.payer.address.toLowerCase(),
    )
  }, 60_000)

  it('arbiter reads evidence via getBatch', async ({ skip }) => {
    if (!evidenceDeployed) skip()

    const batch = await arbiter7.evidence!.getBatch(paymentInfo7, 0n, 0n, 10n)
    expect(batch.entries.length).toBeGreaterThanOrEqual(1)
    expect(batch.entries[0].cid).toBe('QmTestEvidenceCID_lifecycle')
  }, 60_000)
})
