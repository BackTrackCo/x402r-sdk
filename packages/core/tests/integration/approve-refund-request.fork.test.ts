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

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const baseSepolia = x402rChains[84532]
const USDC = baseSepolia.usdc

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

beforeAll(async () => {
  ;({ publicClient, testClient, fixtures, paymentInfo } = await setupScenario({
    salt: 8n,
    operator: 'arbiterRefund',
  }))

  // Use arbiterRefundOperator — refundPostEscrow gated by SignatureCondition
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
// Scenario 8: Arbiter approves refund request (Flow 7)
// ---------------------------------------------------------------------------

describe('Scenario 8: Approve refund request (Flow 7)', () => {
  it('authorize and release payment', async () => {
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo,
    )
    const authHash = await facilitator.payment.authorize(
      paymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash: authHash })

    // Fast-forward past escrow period
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    const releaseHash = await merchant.payment.release(
      paymentInfo,
      DEFAULT_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash: releaseHash })

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.capturableAmount).toBe(0n)
  }, 60_000)

  it('payer requests refund', async () => {
    const hash = await payer.refund!.request(paymentInfo, REFUND_AMOUNT, 0n)
    await publicClient.waitForTransactionReceipt({ hash })

    const status = await arbiter.refund!.getStatus(paymentInfo, 0n)
    // Pending = 0
    expect(status).toBe(0)
  }, 60_000)

  it('arbiter approves refund request', async () => {
    const hash = await arbiter.refund!.approve(paymentInfo, 0n, REFUND_AMOUNT)
    await publicClient.waitForTransactionReceipt({ hash })

    const status = await arbiter.refund!.getStatus(paymentInfo, 0n)
    // Approved = 1
    expect(status).toBe(1)
  }, 60_000)

  it('receiver approves refund budget and refundPostEscrow executes', async () => {
    const receiverRefundCollector = baseSepolia.receiverRefundCollector

    // Receiver approves refund collector to pull tokens
    const approveHash = await merchant.payment.approvePostEscrowRefund(
      USDC,
      REFUND_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash: approveHash })

    const payerBalanceBefore = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })

    // Execute refund — SignatureCondition.check() passes since arbiter approved
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
