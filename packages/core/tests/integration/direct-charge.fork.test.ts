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
  })

  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress: fixtures.operatorAddress,
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
    salt: 6n,
  }
}, 60_000)

// ---------------------------------------------------------------------------
// Scenario 6: Direct Charge — no escrow (Flow 2)
// ---------------------------------------------------------------------------

describe('Scenario 6: Direct Charge (Flow 2)', () => {
  it('charge sends funds directly to receiver minus fees', async () => {
    const payerBalanceBefore = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
    const receiverBalanceBefore = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.receiver.address],
    })

    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo,
    )
    const hash = await payerClient.payment.charge(
      paymentInfo,
      AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const payerBalanceAfter = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
    const receiverBalanceAfter = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.receiver.address],
    })

    // Payer should have paid AMOUNT
    expect(payerBalanceBefore - payerBalanceAfter).toBe(AMOUNT)

    // Receiver should have received AMOUNT minus operator fees (50 bps = 5000)
    const receiverGain = receiverBalanceAfter - receiverBalanceBefore
    expect(receiverGain).toBeGreaterThan(0n)
    expect(receiverGain).toBeLessThan(AMOUNT) // Fees deducted
  }, 60_000)

  it('fee calculation matches expected 50 bps', async () => {
    const fees = await merchant.operator.calculateFees(paymentInfo, AMOUNT)
    expect(fees.operatorFeeBps).toBe(50n)
    expect(fees.operatorFeeAmount).toBe(5000n) // 1_000_000 * 50 / 10_000
    expect(fees.netAmount).toBe(995000n)
  }, 60_000)
})
