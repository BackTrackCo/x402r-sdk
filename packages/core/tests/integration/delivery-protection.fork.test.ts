import type { PublicClient, TestClient, WalletClient } from 'viem'
import { zeroAddress } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  type ArbiterClient,
  createArbiterClient,
  createMerchantClient,
  createX402r,
  type MerchantClient,
  type X402r,
} from '../../../sdk/src/index.js'
import { getOperatorConfig } from '../../src/actions/index.js'
import { x402rChains } from '../../src/config/index.js'
import {
  type DeliveryProtectionOperatorDeployment,
  deployDeliveryProtectionOperator,
} from '../../src/deploy/index.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import { DEFAULT_AMOUNT, FAR_FUTURE, testRoles } from '../setup/constants.js'
import { deployTestFixtures } from '../setup/deploy-fixtures.js'
import { createCollectorData } from '../setup/erc3009-helper.js'

const baseSepolia = x402rChains[84532]
const USDC = baseSepolia.usdc

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ESCROW_PERIOD_SECONDS = 172800n // 2 days — distinct from other fixtures
const ESCROW_FAST_FORWARD = 172801 // 2 days + 1 second

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let walletClient: WalletClient
let deployment: DeliveryProtectionOperatorDeployment

let payerClient: X402r
let arbiterClient: ArbiterClient
let merchant: MerchantClient
let paymentInfo: PaymentInfo

beforeAll(async () => {
  publicClient = anvilBaseSepolia.getPublicClient()
  testClient = anvilBaseSepolia.getTestClient()
  walletClient = anvilBaseSepolia.getWalletClient(testRoles.deployer.address)

  // Deploy fixtures to clear code at test accounts and fund payer with USDC
  await deployTestFixtures(publicClient, walletClient, testClient)

  // Deploy delivery protection operator via preset (tested in deploy.fork.test.ts)
  deployment = await deployDeliveryProtectionOperator(
    walletClient,
    publicClient,
    {
      chainId: 84532,
      arbiter: testRoles.arbiter.address,
      feeRecipient: testRoles.operatorFeeRecipient.address,
      escrowPeriodSeconds: ESCROW_PERIOD_SECONDS,
    },
  )

  const operatorAddress = deployment.operatorAddress
  const escrowPeriodAddress = deployment.escrowPeriodAddress

  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress,
    escrowPeriodAddress,
  })

  arbiterClient = createArbiterClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.arbiter.address),
    operatorAddress,
    escrowPeriodAddress,
  })

  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress,
    escrowPeriodAddress,
  })

  paymentInfo = {
    operator: operatorAddress,
    payer: testRoles.payer.address,
    receiver: testRoles.receiver.address,
    token: USDC,
    maxAmount: DEFAULT_AMOUNT,
    preApprovalExpiry: FAR_FUTURE,
    authorizationExpiry: FAR_FUTURE,
    refundExpiry: FAR_FUTURE,
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: operatorAddress,
    salt: 200n, // distinct from other fork tests
  }
}, 60_000)

// ---------------------------------------------------------------------------
// Verify on-chain operator config
// ---------------------------------------------------------------------------

describe('Delivery Protection: operator config verification', () => {
  it('operator has correct condition addresses', async () => {
    const config = await getOperatorConfig(publicClient, {
      operatorAddress: deployment.operatorAddress,
    })

    // releaseCondition must be the arbiter StaticAddressCondition (not zero)
    expect(config.releaseCondition.toLowerCase()).toBe(
      deployment.arbiterConditionAddress.toLowerCase(),
    )
    expect(config.releaseCondition).not.toBe(zeroAddress)

    // refundInEscrowCondition must be the EscrowPeriod (not zero)
    expect(config.refundInEscrowCondition.toLowerCase()).toBe(
      deployment.escrowPeriodAddress.toLowerCase(),
    )
    expect(config.refundInEscrowCondition).not.toBe(zeroAddress)

    // authorizeRecorder must be the EscrowPeriod (records auth time)
    expect(config.authorizeRecorder.toLowerCase()).toBe(
      deployment.escrowPeriodAddress.toLowerCase(),
    )

    // feeCalculator should be zero (no fees)
    expect(config.feeCalculator).toBe(zeroAddress)
  })
})

// ---------------------------------------------------------------------------
// Happy path: authorize → arbiter calls release() → funds move
// ---------------------------------------------------------------------------

describe('Delivery Protection: arbiter-gated release', () => {
  it('authorize creates a capturable payment', async () => {
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
    expect(amounts.hasCollectedPayment).toBe(true)
    expect(amounts.capturableAmount).toBeGreaterThan(0n)
  }, 60_000)

  it('arbiter releases funds (no escrow wait required)', async () => {
    // Arbiter can release immediately — releaseCondition is StaticAddressCondition(arbiter),
    // not EscrowPeriod, so no time delay is needed.
    const hash = await arbiterClient.payment.release(
      paymentInfo,
      DEFAULT_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.capturableAmount).toBe(0n)
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Access control: non-arbiter cannot call release()
// ---------------------------------------------------------------------------

describe('Delivery Protection: access control', () => {
  let accessControlPaymentInfo: PaymentInfo

  beforeAll(async () => {
    accessControlPaymentInfo = { ...paymentInfo, salt: 201n }

    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      accessControlPaymentInfo,
    )

    const hash = await payerClient.payment.authorize(
      accessControlPaymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })
  }, 60_000)

  it('non-arbiter (receiver) cannot call release()', async () => {
    await expect(
      merchant.payment.release(accessControlPaymentInfo, DEFAULT_AMOUNT),
    ).rejects.toThrow()
  }, 60_000)

  it('non-arbiter (payer) cannot call release()', async () => {
    const payerAsReleaser = createX402r({
      publicClient,
      walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      operatorAddress: deployment.operatorAddress,
      escrowPeriodAddress: deployment.escrowPeriodAddress,
    })

    await expect(
      payerAsReleaser.payment.release(accessControlPaymentInfo, DEFAULT_AMOUNT),
    ).rejects.toThrow()
  }, 60_000)
})

// ---------------------------------------------------------------------------
// Timeout path: authorize → escrow expires → anyone calls refundInEscrow()
// ---------------------------------------------------------------------------

describe('Delivery Protection: timeout auto-refund', () => {
  let timeoutPaymentInfo: PaymentInfo

  beforeAll(async () => {
    timeoutPaymentInfo = { ...paymentInfo, salt: 202n }

    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      timeoutPaymentInfo,
    )

    const hash = await payerClient.payment.authorize(
      timeoutPaymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })
  }, 60_000)

  it('refundInEscrow reverts before escrow expires', async () => {
    await expect(
      payerClient.payment.refundInEscrow(timeoutPaymentInfo, DEFAULT_AMOUNT),
    ).rejects.toThrow()
  }, 60_000)

  it('refundInEscrow succeeds after escrow expires', async () => {
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    const hash = await payerClient.payment.refundInEscrow(
      timeoutPaymentInfo,
      DEFAULT_AMOUNT,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(timeoutPaymentInfo)
    expect(amounts.capturableAmount).toBe(0n)
  }, 60_000)
})
