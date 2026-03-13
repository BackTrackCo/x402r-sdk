import type { PublicClient } from 'viem'
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
import { DEFAULT_AMOUNT, testRoles } from '../setup/constants.js'
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
let fixtures: DeployedFixtures
let payerClient: X402r
let merchant: MerchantClient

let paymentInfo: PaymentInfo

beforeAll(async () => {
  ;({ publicClient, fixtures, paymentInfo } = await setupScenario({
    salt: 6n,
  }))

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
      DEFAULT_AMOUNT,
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
    expect(payerBalanceBefore - payerBalanceAfter).toBe(DEFAULT_AMOUNT)

    // Receiver should have received AMOUNT minus operator fees (50 bps = 5000)
    const receiverGain = receiverBalanceAfter - receiverBalanceBefore
    expect(receiverGain).toBeGreaterThan(0n)
    expect(receiverGain).toBeLessThan(DEFAULT_AMOUNT) // Fees deducted
  }, 60_000)

  it('fee calculation matches expected 50 bps', async () => {
    const fees = await merchant.operator.calculateFees(
      paymentInfo,
      DEFAULT_AMOUNT,
    )
    expect(fees.operatorFeeBps).toBe(50n)
    expect(fees.operatorFeeAmount).toBe(5000n) // 1_000_000 * 50 / 10_000
    expect(fees.netAmount).toBe(995000n)
  }, 60_000)
})
