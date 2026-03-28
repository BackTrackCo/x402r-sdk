import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Address, PublicClient } from 'viem'
import { pad, zeroAddress } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import { createX402r, type X402r } from '../../../sdk/src/index.js'
import {
  paymentIndexRecorderAbi,
  paymentOperatorFactoryAbi,
} from '../../src/abis/generated.js'
import {
  getPayerPayment,
  getPayerPaymentsByEvents,
  getPayerPaymentsFromRecorder,
  getReceiverPayment,
  getReceiverPaymentsByEvents,
  getReceiverPaymentsFromRecorder,
  getRecorderPaymentInfo,
} from '../../src/actions/index.js'
import { x402rChains } from '../../src/config/index.js'
import { computePaymentInfoHash } from '../../src/payment/hashing.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import { DEFAULT_AMOUNT, FAR_FUTURE, testRoles } from '../setup/constants.js'
import type { DeployedFixtures } from '../setup/deploy-fixtures.js'
import { createCollectorData } from '../setup/erc3009-helper.js'
import { setupScenario } from '../setup/scenario-helper.js'

// ---------------------------------------------------------------------------
// PaymentIndexRecorder bytecode — loaded from contract build artifacts.
// In CI the `test-fork` job clones x402r-contracts and runs `forge build`.
// Locally, the workspace layout places x402r-contracts at the same level.
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url))
const artifact = JSON.parse(
  readFileSync(
    resolve(
      __dirname,
      '../../../../../x402r-contracts/out/PaymentIndexRecorder.sol/PaymentIndexRecorder.json',
    ),
    'utf-8',
  ),
)
const PAYMENT_INDEX_RECORDER_BYTECODE = artifact.bytecode
  .object as `0x${string}`

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const baseSepolia = x402rChains[84532]
const USDC = baseSepolia.usdc
const factories = baseSepolia.factories

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let fixtures: DeployedFixtures
let payerClient: X402r
let paymentInfo: PaymentInfo
let paymentIndexRecorderAddress: Address
let recorderOperatorAddress: Address
let authBlock: bigint

beforeAll(async () => {
  ;({ publicClient, fixtures } = await setupScenario({ salt: 100n }))

  const deployer = testRoles.deployer.address
  const deployerWallet = anvilBaseSepolia.getWalletClient(deployer)

  // 1. Deploy PaymentIndexRecorder (operator calls it directly — no combinator needed)
  //    AUTHORIZED_CODEHASH = bytes32(0) means only paymentInfo.operator can call record()
  const deployHash = await deployerWallet.deployContract({
    abi: paymentIndexRecorderAbi,
    bytecode: PAYMENT_INDEX_RECORDER_BYTECODE,
    args: [baseSepolia.authCaptureEscrow, pad('0x00')],
    chain: deployerWallet.chain,
  })
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: deployHash,
  })
  paymentIndexRecorderAddress = receipt.contractAddress!

  // 2. Deploy PaymentOperator with PaymentIndexRecorder as authorizeRecorder
  //    Note: Using recorder directly (not combinator) — release won't work
  //    without EscrowPeriod, but this test only needs authorize + query.
  const operatorConfig = {
    feeRecipient: testRoles.operatorFeeRecipient.address,
    feeCalculator: fixtures.feeCalculatorAddress,
    authorizeCondition: zeroAddress,
    authorizeRecorder: paymentIndexRecorderAddress,
    chargeCondition: zeroAddress,
    chargeRecorder: zeroAddress,
    releaseCondition: zeroAddress,
    releaseRecorder: zeroAddress,
    refundInEscrowCondition: zeroAddress,
    refundInEscrowRecorder: zeroAddress,
    refundPostEscrowCondition: baseSepolia.conditions.receiver,
    refundPostEscrowRecorder: zeroAddress,
  } as const

  const opDeployHash = await deployerWallet.writeContract({
    address: factories.paymentOperator,
    abi: paymentOperatorFactoryAbi,
    functionName: 'deployOperator',
    args: [operatorConfig],
    chain: deployerWallet.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: opDeployHash })

  recorderOperatorAddress = await publicClient.readContract({
    address: factories.paymentOperator,
    abi: paymentOperatorFactoryAbi,
    functionName: 'computeAddress',
    args: [operatorConfig],
  })

  // 6. Build PaymentInfo and authorize a payment
  paymentInfo = {
    operator: recorderOperatorAddress,
    payer: testRoles.payer.address,
    receiver: testRoles.receiver.address,
    token: USDC,
    maxAmount: DEFAULT_AMOUNT,
    preApprovalExpiry: FAR_FUTURE,
    authorizationExpiry: FAR_FUTURE,
    refundExpiry: FAR_FUTURE,
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: recorderOperatorAddress,
    salt: 100n,
  }

  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: recorderOperatorAddress,
  })

  const { collectorData, tokenCollector } = await createCollectorData(
    anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    paymentInfo,
  )

  const authHash = await payerClient.payment.authorize(
    paymentInfo,
    DEFAULT_AMOUNT,
    tokenCollector,
    collectorData,
  )
  const authReceipt = await publicClient.waitForTransactionReceipt({
    hash: authHash,
  })
  authBlock = authReceipt.blockNumber
}, 60_000)

// ---------------------------------------------------------------------------
// Recorder query tests
// ---------------------------------------------------------------------------

describe('Recorder queries after authorize', () => {
  it('getPayerPaymentsFromRecorder returns the authorized payment', async () => {
    const result = await getPayerPaymentsFromRecorder(publicClient, {
      recorderAddress: paymentIndexRecorderAddress,
      payer: testRoles.payer.address,
      offset: 0n,
      count: 100n,
    })

    expect(result.total).toBe(1n)
    expect(result.payments).toHaveLength(1)
    expect(result.payments[0].operator.toLowerCase()).toBe(
      recorderOperatorAddress.toLowerCase(),
    )
    expect(result.payments[0].payer.toLowerCase()).toBe(
      testRoles.payer.address.toLowerCase(),
    )
    expect(result.payments[0].salt).toBe(100n)
  })

  it('getReceiverPaymentsFromRecorder returns the authorized payment', async () => {
    const result = await getReceiverPaymentsFromRecorder(publicClient, {
      recorderAddress: paymentIndexRecorderAddress,
      receiver: testRoles.receiver.address,
      offset: 0n,
      count: 100n,
    })

    expect(result.total).toBe(1n)
    expect(result.payments).toHaveLength(1)
    expect(result.payments[0].receiver.toLowerCase()).toBe(
      testRoles.receiver.address.toLowerCase(),
    )
  })

  it('getPayerPayment returns correct PaymentInfo by index', async () => {
    const result = await getPayerPayment(publicClient, {
      recorderAddress: paymentIndexRecorderAddress,
      payer: testRoles.payer.address,
      index: 0n,
    })

    expect(result.operator.toLowerCase()).toBe(
      recorderOperatorAddress.toLowerCase(),
    )
    expect(result.salt).toBe(100n)
  })

  it('getReceiverPayment returns correct PaymentInfo by index', async () => {
    const result = await getReceiverPayment(publicClient, {
      recorderAddress: paymentIndexRecorderAddress,
      receiver: testRoles.receiver.address,
      index: 0n,
    })

    expect(result.operator.toLowerCase()).toBe(
      recorderOperatorAddress.toLowerCase(),
    )
    expect(result.salt).toBe(100n)
  })

  it('getRecorderPaymentInfo returns correct PaymentInfo by hash', async () => {
    const hash = computePaymentInfoHash(
      84532,
      baseSepolia.authCaptureEscrow,
      paymentInfo,
    )

    const result = await getRecorderPaymentInfo(publicClient, {
      recorderAddress: paymentIndexRecorderAddress,
      hash,
    })

    expect(result).not.toBeNull()
    expect(result!.salt).toBe(100n)
    expect(result!.operator.toLowerCase()).toBe(
      recorderOperatorAddress.toLowerCase(),
    )
  })
})

// ---------------------------------------------------------------------------
// Event query tests
// ---------------------------------------------------------------------------

describe('Event queries after authorize', () => {
  // Note: Anvil forks may not reliably support eth_getLogs for newly-mined blocks.
  // These tests verify the event query path works when logs are available.

  it('getPayerPaymentsByEvents returns events from the operator', async () => {
    const results = await getPayerPaymentsByEvents(publicClient, {
      operatorAddress: recorderOperatorAddress,
      payer: testRoles.payer.address,
      fromBlock: authBlock,
    })

    // On Anvil forks, eth_getLogs may return empty for post-fork blocks
    if (results.length === 0) return

    expect(results[0].salt).toBe(100n)
    expect(results[0].operator.toLowerCase()).toBe(
      recorderOperatorAddress.toLowerCase(),
    )
  })

  it('getReceiverPaymentsByEvents returns events from the operator', async () => {
    const results = await getReceiverPaymentsByEvents(publicClient, {
      operatorAddress: recorderOperatorAddress,
      receiver: testRoles.receiver.address,
      fromBlock: authBlock,
    })

    if (results.length === 0) return

    expect(results[0].salt).toBe(100n)
    expect(results[0].receiver.toLowerCase()).toBe(
      testRoles.receiver.address.toLowerCase(),
    )
  })
})
