import type { Address } from 'viem'
import { describe, expect, it } from 'vitest'
import { ConfigError, ValidationError } from '../src/errors/index.js'
import { refundable } from '../src/helpers/index.js'

const OPERATOR: Address = '0x1111111111111111111111111111111111111111'
const BASE_SEPOLIA_USDC: Address = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const BASE_MAINNET_USDC: Address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const CUSTOM_FEE_RECEIVER: Address =
  '0x2222222222222222222222222222222222222222'

describe('refundable', () => {
  it('populates name/version from USDC token info (Base Sepolia)', () => {
    const result = refundable({
      operatorAddress: OPERATOR,
      network: 'eip155:84532',
      token: BASE_SEPOLIA_USDC,
    })

    expect(result.extra.name).toBe('USDC')
    expect(result.extra.version).toBe('2')
  })

  it('populates name/version from USDC token info (Base Mainnet)', () => {
    const result = refundable({
      operatorAddress: OPERATOR,
      network: 'eip155:8453',
      token: BASE_MAINNET_USDC,
    })

    expect(result.extra.name).toBe('USD Coin')
    expect(result.extra.version).toBe('2')
  })

  it('defaults feeReceiver to operator address', () => {
    const result = refundable({
      operatorAddress: OPERATOR,
      network: 'eip155:84532',
      token: BASE_SEPOLIA_USDC,
    })

    expect(result.extra.feeReceiver).toBe(OPERATOR)
  })

  it('allows override for feeReceiver', () => {
    const result = refundable({
      operatorAddress: OPERATOR,
      network: 'eip155:84532',
      token: BASE_SEPOLIA_USDC,
      feeReceiver: CUSTOM_FEE_RECEIVER,
    })

    expect(result.extra.feeReceiver).toBe(CUSTOM_FEE_RECEIVER)
  })

  it('allows overrides for name and version', () => {
    const result = refundable({
      operatorAddress: OPERATOR,
      network: 'eip155:84532',
      token: BASE_SEPOLIA_USDC,
      name: 'CustomToken',
      version: '3',
    })

    expect(result.extra.name).toBe('CustomToken')
    expect(result.extra.version).toBe('3')
  })

  it('throws ValidationError when minFeeBps > maxFeeBps', () => {
    expect(() =>
      refundable({
        operatorAddress: OPERATOR,
        network: 'eip155:84532',
        token: BASE_SEPOLIA_USDC,
        minFeeBps: 500,
        maxFeeBps: 100,
      }),
    ).toThrow(ValidationError)
  })

  it('throws ValidationError when maxFeeBps > 10000', () => {
    expect(() =>
      refundable({
        operatorAddress: OPERATOR,
        network: 'eip155:84532',
        token: BASE_SEPOLIA_USDC,
        maxFeeBps: 10001,
      }),
    ).toThrow(ValidationError)
  })

  it('throws ValidationError when minFeeBps < 0', () => {
    expect(() =>
      refundable({
        operatorAddress: OPERATOR,
        network: 'eip155:84532',
        token: BASE_SEPOLIA_USDC,
        minFeeBps: -1,
      }),
    ).toThrow(ValidationError)
  })

  it('populates escrowAddress and tokenCollector from chain config', () => {
    const result = refundable({
      operatorAddress: OPERATOR,
      network: 'eip155:84532',
      token: BASE_SEPOLIA_USDC,
    })

    expect(result.extra.escrowAddress).toBe(
      '0x29025c0E9D4239d438e169570818dB9FE0A80873',
    )
    expect(result.extra.tokenCollector).toBe(
      '0x5cA789000070DF15b4663DB64a50AeF5D49c5Ee0',
    )
  })

  it('preserves existing extra fields', () => {
    const result = refundable({
      operatorAddress: OPERATOR,
      network: 'eip155:84532',
      token: BASE_SEPOLIA_USDC,
      extra: { customField: 'hello', anotherField: 42 },
    })

    expect(result.extra.customField).toBe('hello')
    expect(result.extra.anotherField).toBe(42)
    expect(result.extra.escrowAddress).toBeDefined()
  })

  it('throws ConfigError on unsupported network', () => {
    expect(() =>
      refundable({
        operatorAddress: OPERATOR,
        network: 'eip155:999999',
        token: BASE_SEPOLIA_USDC,
      }),
    ).toThrow(ConfigError)
  })

  it('throws ConfigError for unknown token without name/version overrides', () => {
    const unknownToken: Address = '0x9999999999999999999999999999999999999999'
    expect(() =>
      refundable({
        operatorAddress: OPERATOR,
        network: 'eip155:84532',
        token: unknownToken,
      }),
    ).toThrow(ConfigError)
  })

  it('sets network and token on the returned PaymentOption', () => {
    const result = refundable({
      operatorAddress: OPERATOR,
      network: 'eip155:84532',
      token: BASE_SEPOLIA_USDC,
    })

    expect(result.network).toBe('eip155:84532')
    expect(result.token).toBe(BASE_SEPOLIA_USDC)
  })
})
