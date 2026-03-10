import type { PublicClient, TestClient } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  type ArbiterClient,
  createArbiterClient,
  createPayerClient,
  createX402r,
  type PayerClient,
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
let facilitator: X402r
let payer: PayerClient
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

  // Facilitator submits authorize (in x402 flow, the scheme does this)
  facilitator = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.operatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
    tokenCollector: fixtures.preApprovalCollectorAddress,
  })

  payer = createPayerClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.operatorAddress,
    refundRequestAddress: fixtures.signatureRefundRequestAddress,
    tokenCollector: fixtures.preApprovalCollectorAddress,
  })

  arbiter = createArbiterClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.arbiter.address),
    operatorAddress: fixtures.operatorAddress,
    refundRequestAddress: fixtures.signatureRefundRequestAddress,
    tokenCollector: fixtures.preApprovalCollectorAddress,
  })

  paymentInfo = {
    operator: fixtures.operatorAddress,
    payer: testRoles.payer.address,
    receiver: testRoles.receiver.address,
    token: USDC,
    maxAmount: AMOUNT,
    preApprovalExpiry: FAR_FUTURE,
    authorizationExpiry: FAR_FUTURE,
    refundExpiry: FAR_FUTURE,
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: fixtures.operatorAddress,
    salt: 5n,
  }
}, 60_000)

// ---------------------------------------------------------------------------
// Scenario 5: Payer requests refund, arbiter denies
// ---------------------------------------------------------------------------

describe('Scenario 5: Deny refund request', () => {
  it('authorize creates a capturable payment', async () => {
    const hash = await facilitator.payment.approveAndAuthorize(
      paymentInfo,
      AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await payer.payment.getAmounts(paymentInfo)
    expect(amounts.capturableAmount).toBeGreaterThan(0n)
  }, 60_000)

  it('payer requests refund', async () => {
    const hash = await payer.refund.request(paymentInfo, AMOUNT, 0n)
    await publicClient.waitForTransactionReceipt({ hash })

    const hasRequest = await arbiter.refund.has(paymentInfo, 0n)
    expect(hasRequest).toBe(true)
  }, 60_000)

  it('arbiter denies the refund request', async () => {
    const hash = await arbiter.refund.deny(paymentInfo, 0n)
    await publicClient.waitForTransactionReceipt({ hash })

    const status = await arbiter.refund.getStatus(paymentInfo, 0n)
    // Denied = 2 in RefundRequestStatus enum
    expect(status).toBe(2)
  }, 60_000)

  it('payment state is unchanged after denial', async () => {
    const amounts = await payer.payment.getAmounts(paymentInfo)
    expect(amounts.capturableAmount).toBeGreaterThan(0n)
    // hasCollectedPayment = true means tokens are in escrow (set during authorize)
    expect(amounts.hasCollectedPayment).toBe(true)
  }, 60_000)
})
