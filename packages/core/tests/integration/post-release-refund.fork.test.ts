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
import { testRoles } from '../setup/constants.js'
import {
  type DeployedFixtures,
  deployTestFixtures,
} from '../setup/deploy-fixtures.js'
import { createCollectorData } from '../setup/erc3009-helper.js'

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

const AMOUNT = 1_000_000n
const REFUND_AMOUNT = 500_000n

let paymentInfo: PaymentInfo

beforeAll(async () => {
  publicClient = anvilBaseSepolia.getPublicClient()
  testClient = anvilBaseSepolia.getTestClient()
  const deployerWallet = anvilBaseSepolia.getWalletClient(
    testRoles.deployer.address,
  )

  fixtures = await deployTestFixtures(publicClient, deployerWallet, testClient)

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
    salt: 7n,
  }
}, 60_000)

// ---------------------------------------------------------------------------
// Scenario 7: Post-release refund (Flow 4)
// ---------------------------------------------------------------------------

describe('Scenario 7: Post-release refund (Flow 4)', () => {
  it('authorize and release payment to receiver', async () => {
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo,
    )
    const authHash = await payerClient.payment.authorize(
      paymentInfo,
      AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash: authHash })

    // Fast-forward past escrow period
    await testClient.increaseTime({ seconds: 604801 })
    await testClient.mine({ blocks: 1 })

    const releaseHash = await merchant.payment.release(paymentInfo, AMOUNT)
    await publicClient.waitForTransactionReceipt({ hash: releaseHash })

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.capturableAmount).toBe(0n)
  }, 60_000)

  it('receiver approves post-escrow refund budget', async () => {
    const approveHash = await merchant.payment.approvePostEscrowRefund(
      USDC,
      REFUND_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash: approveHash })

    const allowance = await merchant.payment.getPostEscrowRefundAllowance(
      USDC,
      testRoles.receiver.address,
    )
    expect(allowance).toBe(REFUND_AMOUNT)
  }, 60_000)

  it('refundPostEscrow transfers funds back to payer', async () => {
    const receiverRefundCollector = baseSepolia.receiverRefundCollector

    const payerBalanceBefore = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })

    const refundHash = await merchant.payment.refundPostEscrow(
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
