import type { PublicClient } from 'viem'
import { pad, zeroAddress } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  arbiterRegistryAbi,
  authCaptureEscrowAbi,
  protocolFeeConfigAbi,
  receiverRefundCollectorAbi,
  refundRequestEvidenceAbi,
  usdcTvlLimitAbi,
} from '../../src/abis/generated.js'
import { x402rChains } from '../../src/config/index.js'
import {
  computeAndConditionAddress,
  computeEscrowPeriodAddress,
  computeFeeCalculatorAddress,
  computeFreezeAddress,
  computeNotConditionAddress,
  computeOperatorAddress,
  computeOrConditionAddress,
  computeRecorderCombinatorAddress,
  computeSignatureConditionAddress,
  computeSignatureRefundRequestAddress,
  computeStaticAddressConditionAddress,
} from '../../src/deploy/index.js'
import type { OperatorConfig } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'

const config = x402rChains[84532]

describe('Config Address Smoke Tests (Fork)', () => {
  let publicClient: PublicClient

  beforeAll(() => {
    publicClient = anvilBaseSepolia.getPublicClient()
  })

  // ---------------------------------------------------------------------------
  // Protocol contracts — call a distinctive view function on each
  // ---------------------------------------------------------------------------

  it('authCaptureEscrow responds to PAYMENT_INFO_TYPEHASH()', async () => {
    const result = await publicClient.readContract({
      address: config.authCaptureEscrow,
      abi: authCaptureEscrowAbi,
      functionName: 'PAYMENT_INFO_TYPEHASH',
    })
    expect(result).toMatch(/^0x[0-9a-fA-F]{64}$/)
  })

  it('protocolFeeConfig responds to MAX_PROTOCOL_FEE_BPS()', async () => {
    const result = await publicClient.readContract({
      address: config.protocolFeeConfig,
      abi: protocolFeeConfigAbi,
      functionName: 'MAX_PROTOCOL_FEE_BPS',
    })
    expect(result).toBeGreaterThan(0n)
  })

  it('usdcTvlLimit responds to ESCROW()', async () => {
    const result = await publicClient.readContract({
      address: config.usdcTvlLimit,
      abi: usdcTvlLimitAbi,
      functionName: 'ESCROW',
    })
    expect(result).toMatch(/^0x[0-9a-fA-F]{40}$/)
  })

  it('arbiterRegistry responds to arbiterCount()', async () => {
    const result = await publicClient.readContract({
      address: config.arbiterRegistry,
      abi: arbiterRegistryAbi,
      functionName: 'arbiterCount',
    })
    expect(typeof result).toBe('bigint')
  })

  it('receiverRefundCollector responds to authCaptureEscrow()', async () => {
    const result = await publicClient.readContract({
      address: config.receiverRefundCollector,
      abi: receiverRefundCollectorAbi,
      functionName: 'authCaptureEscrow',
    })
    expect(result).toMatch(/^0x[0-9a-fA-F]{40}$/)
  })

  it('refundRequestEvidence responds to REFUND_REQUEST()', async () => {
    const result = await publicClient.readContract({
      address: config.refundRequestEvidence,
      abi: refundRequestEvidenceAbi,
      functionName: 'REFUND_REQUEST',
    })
    expect(result).toMatch(/^0x[0-9a-fA-F]{40}$/)
  })

  it('tokenCollector has non-zero bytecode', async () => {
    const code = await publicClient.getCode({ address: config.tokenCollector })
    expect(code).toBeDefined()
    expect(code).not.toBe('0x')
  })

  // ---------------------------------------------------------------------------
  // Factories — call computeAddress with dummy args to prove each responds
  // ---------------------------------------------------------------------------

  const dummyOperatorConfig: OperatorConfig = {
    feeRecipient: zeroAddress,
    feeCalculator: zeroAddress,
    authorizeCondition: zeroAddress,
    authorizeRecorder: zeroAddress,
    chargeCondition: zeroAddress,
    chargeRecorder: zeroAddress,
    releaseCondition: zeroAddress,
    releaseRecorder: zeroAddress,
    refundInEscrowCondition: zeroAddress,
    refundInEscrowRecorder: zeroAddress,
    refundPostEscrowCondition: zeroAddress,
    refundPostEscrowRecorder: zeroAddress,
  }

  it('paymentOperator factory responds to computeAddress', async () => {
    const addr = await computeOperatorAddress(publicClient, {
      factoryAddress: config.factories.paymentOperator,
      config: dummyOperatorConfig,
    })
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(addr).not.toBe(zeroAddress)
  })

  it('escrowPeriod factory responds to computeAddress', async () => {
    const addr = await computeEscrowPeriodAddress(publicClient, {
      factoryAddress: config.factories.escrowPeriod,
      escrowPeriod: 1n,
      authorizedCodehash: pad('0x00'),
    })
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(addr).not.toBe(zeroAddress)
  })

  it('freeze factory responds to computeAddress', async () => {
    const addr = await computeFreezeAddress(publicClient, {
      factoryAddress: config.factories.freeze,
      freezeCondition: zeroAddress,
      unfreezeCondition: zeroAddress,
      freezeDuration: 1n,
      escrowPeriodContract: zeroAddress,
    })
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(addr).not.toBe(zeroAddress)
  })

  it('staticFeeCalculator factory responds to computeAddress', async () => {
    const addr = await computeFeeCalculatorAddress(publicClient, {
      factoryAddress: config.factories.staticFeeCalculator,
      feeBps: 1n,
    })
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(addr).not.toBe(zeroAddress)
  })

  it('staticAddressCondition factory responds to computeAddress', async () => {
    const addr = await computeStaticAddressConditionAddress(publicClient, {
      factoryAddress: config.factories.staticAddressCondition,
      designatedAddress: zeroAddress,
    })
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(addr).not.toBe(zeroAddress)
  })

  it('andCondition factory responds to computeAddress', async () => {
    const addr = await computeAndConditionAddress(publicClient, {
      factoryAddress: config.factories.andCondition,
      conditions: [zeroAddress],
    })
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(addr).not.toBe(zeroAddress)
  })

  it('orCondition factory responds to computeAddress', async () => {
    const addr = await computeOrConditionAddress(publicClient, {
      factoryAddress: config.factories.orCondition,
      conditions: [zeroAddress],
    })
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(addr).not.toBe(zeroAddress)
  })

  it('notCondition factory responds to computeAddress', async () => {
    const addr = await computeNotConditionAddress(publicClient, {
      factoryAddress: config.factories.notCondition,
      condition: zeroAddress,
    })
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(addr).not.toBe(zeroAddress)
  })

  it('recorderCombinator factory responds to computeAddress', async () => {
    const addr = await computeRecorderCombinatorAddress(publicClient, {
      factoryAddress: config.factories.recorderCombinator,
      recorders: [zeroAddress],
    })
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(addr).not.toBe(zeroAddress)
  })

  it('signatureCondition factory responds to computeAddress', async () => {
    const addr = await computeSignatureConditionAddress(publicClient, {
      factoryAddress: config.factories.signatureCondition,
      signer: zeroAddress,
    })
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(addr).not.toBe(zeroAddress)
  })

  it('signatureRefundRequest factory responds to computeAddress', async () => {
    const addr = await computeSignatureRefundRequestAddress(publicClient, {
      factoryAddress: config.factories.signatureRefundRequest,
      signatureCondition: zeroAddress,
    })
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(addr).not.toBe(zeroAddress)
  })

  // ---------------------------------------------------------------------------
  // Condition singletons — verify bytecode exists at each address
  // ---------------------------------------------------------------------------

  it('payer condition singleton has non-zero bytecode', async () => {
    const code = await publicClient.getCode({
      address: config.conditions.payer,
    })
    expect(code).toBeDefined()
    expect(code).not.toBe('0x')
  })

  it('receiver condition singleton has non-zero bytecode', async () => {
    const code = await publicClient.getCode({
      address: config.conditions.receiver,
    })
    expect(code).toBeDefined()
    expect(code).not.toBe('0x')
  })

  it('alwaysTrue condition singleton has non-zero bytecode', async () => {
    const code = await publicClient.getCode({
      address: config.conditions.alwaysTrue,
    })
    expect(code).toBeDefined()
    expect(code).not.toBe('0x')
  })
})
