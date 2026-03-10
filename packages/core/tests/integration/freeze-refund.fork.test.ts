import type { PublicClient, TestClient } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  type ArbiterClient,
  createArbiterClient,
  createMerchantClient,
  createX402r,
  type MerchantClient,
  type X402r,
} from '../../../sdk/src/index.js'
import { x402rChains } from '../../src/config/index.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import { testRoles } from '../setup/constants.js'
import {
  type DeployedFixtures,
  deployTestFixtures,
} from '../setup/deploy-fixtures.js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const baseSepolia = x402rChains[84532]
const USDC = baseSepolia.usdc
const FAR_FUTURE = 281474976710655

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let payerClient: X402r
let merchant: MerchantClient
let arbiter: ArbiterClient

const AMOUNT = 1_000_000n

let paymentInfo: PaymentInfo

beforeAll(async () => {
  publicClient = anvilBaseSepolia.getPublicClient()
  testClient = anvilBaseSepolia.getTestClient()
  const deployerWallet = anvilBaseSepolia.getWalletClient(
    testRoles.deployer.address,
  )

  fixtures = await deployTestFixtures(publicClient, deployerWallet, testClient)

  // Payer client uses the freeze-enabled operator for authorization
  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.operatorWithFreezeAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
    freezeAddress: fixtures.freezeAddress,
    tokenCollector: fixtures.preApprovalCollectorAddress,
  })

  // Merchant uses the freeze-enabled operator
  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress: fixtures.operatorWithFreezeAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
    freezeAddress: fixtures.freezeAddress,
    tokenCollector: fixtures.preApprovalCollectorAddress,
  })

  // Arbiter uses the freeze-enabled operator
  arbiter = createArbiterClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.arbiter.address),
    operatorAddress: fixtures.operatorWithFreezeAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
    freezeAddress: fixtures.freezeAddress,
    tokenCollector: fixtures.preApprovalCollectorAddress,
  })

  paymentInfo = {
    operator: fixtures.operatorWithFreezeAddress,
    payer: testRoles.payer.address,
    receiver: testRoles.receiver.address,
    token: USDC,
    maxAmount: AMOUNT,
    preApprovalExpiry: FAR_FUTURE,
    authorizationExpiry: FAR_FUTURE,
    refundExpiry: FAR_FUTURE,
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: fixtures.operatorWithFreezeAddress,
    salt: 4n,
  }
}, 60_000)

// ---------------------------------------------------------------------------
// Scenario 4: Freeze blocks release, refundInEscrow still works
// ---------------------------------------------------------------------------

describe('Scenario 4: Freeze blocks release', () => {
  it('authorize creates capturable payment on freeze-enabled operator', async () => {
    const hash = await payerClient.payment.approveAndAuthorize(
      paymentInfo,
      AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.capturableAmount).toBeGreaterThan(0n)
  }, 60_000)

  it('arbiter freezes payment and isFrozen returns true', async () => {
    const hash = await arbiter.freeze!.freeze(paymentInfo)
    await publicClient.waitForTransactionReceipt({ hash })

    expect(await arbiter.freeze!.isFrozen(paymentInfo)).toBe(true)
  }, 60_000)

  it('release reverts while frozen (even after escrow period)', async () => {
    // Fast-forward past escrow period
    await testClient.increaseTime({ seconds: 604801 })
    await testClient.mine({ blocks: 1 })

    // EscrowPeriod condition passes, but Freeze condition fails → release reverts
    // Note: JSON-RPC wallet clients on Anvil don't simulate before sending,
    // so writeContract returns a hash even for reverting txs. Check receipt status.
    const hash = await merchant.payment.release(paymentInfo, AMOUNT)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    expect(receipt.status).toBe('reverted')
  }, 60_000)

  it('receiver can refundInEscrow even while frozen', async () => {
    // refundInEscrow does NOT check freeze — only ReceiverCondition
    const amountsBefore = await merchant.payment.getAmounts(paymentInfo)

    const hash = await merchant.refund.refundInEscrow(
      paymentInfo,
      amountsBefore.capturableAmount,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amountsAfter = await merchant.payment.getAmounts(paymentInfo)
    expect(amountsAfter.capturableAmount).toBe(0n)
  }, 60_000)
})
