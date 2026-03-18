import type { PublicClient, TestClient } from 'viem'
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
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let payerClient: X402r
let receiverClient: X402r
let merchant: MerchantClient

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
}, 60_000)

// ---------------------------------------------------------------------------
// Scenario 4: Freeze blocks release, refundInEscrow still works
// ---------------------------------------------------------------------------

describe('Scenario 4: Freeze blocks release', () => {
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

  it('receiver can refundInEscrow even while frozen', async () => {
    // refundInEscrow does NOT check freeze — only ReceiverCondition (on this fixture)
    // Note: refundInEscrow is hidden from MerchantClient — use full X402r client
    const amountsBefore = await receiverClient.payment.getAmounts(paymentInfo)

    const hash = await receiverClient.payment.refundInEscrow(
      paymentInfo,
      amountsBefore.capturableAmount,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amountsAfter = await receiverClient.payment.getAmounts(paymentInfo)
    expect(amountsAfter.capturableAmount).toBe(0n)
  }, 60_000)
})
