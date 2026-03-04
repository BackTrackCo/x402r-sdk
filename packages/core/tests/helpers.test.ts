import type { Address } from 'viem'
import { describe, expect, it } from 'vitest'
import { ConfigError, ValidationError } from '../src/errors/index.js'
import { refundable } from '../src/helpers/index.js'

const OPERATOR: Address = '0x1111111111111111111111111111111111111111'
const CUSTOM_FEE_RECEIVER: Address =
  '0x2222222222222222222222222222222222222222'
const CUSTOM_ESCROW: Address = '0x3333333333333333333333333333333333333333'
const CUSTOM_TOKEN_COLLECTOR: Address =
  '0x4444444444444444444444444444444444444444'

const BASE_OPTION = {
  scheme: 'escrow' as const,
  price: '$0.01',
  network: 'eip155:84532',
  payTo: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address,
}

describe('refundable', () => {
  it('defaults feeReceiver to operator address', () => {
    const result = refundable(BASE_OPTION, OPERATOR)

    expect(result.extra.feeReceiver).toBe(OPERATOR)
  })

  it('allows override for feeReceiver', () => {
    const result = refundable(BASE_OPTION, OPERATOR, {
      feeReceiver: CUSTOM_FEE_RECEIVER,
    })

    expect(result.extra.feeReceiver).toBe(CUSTOM_FEE_RECEIVER)
  })

  it('throws ValidationError when minFeeBps > maxFeeBps', () => {
    expect(() =>
      refundable(BASE_OPTION, OPERATOR, {
        minFeeBps: 500,
        maxFeeBps: 100,
      }),
    ).toThrow(ValidationError)
  })

  it('throws ValidationError when maxFeeBps > 10000', () => {
    expect(() =>
      refundable(BASE_OPTION, OPERATOR, { maxFeeBps: 10001 }),
    ).toThrow(ValidationError)
  })

  it('throws ValidationError when minFeeBps < 0', () => {
    expect(() => refundable(BASE_OPTION, OPERATOR, { minFeeBps: -1 })).toThrow(
      ValidationError,
    )
  })

  it('populates escrowAddress and tokenCollector from chain config', () => {
    const result = refundable(BASE_OPTION, OPERATOR)

    expect(result.extra.escrowAddress).toBe(
      '0x29025c0E9D4239d438e169570818dB9FE0A80873',
    )
    expect(result.extra.tokenCollector).toBe(
      '0x5cA789000070DF15b4663DB64a50AeF5D49c5Ee0',
    )
  })

  it('preserves existing extra fields via overrides', () => {
    const result = refundable(BASE_OPTION, OPERATOR, {
      extra: { customField: 'hello', anotherField: 42 },
    })

    expect(result.extra.customField).toBe('hello')
    expect(result.extra.anotherField).toBe(42)
    expect(result.extra.escrowAddress).toBeDefined()
  })

  it('throws ConfigError on unsupported network', () => {
    expect(() =>
      refundable({ ...BASE_OPTION, network: 'eip155:999999' }, OPERATOR),
    ).toThrow(ConfigError)
  })

  it('passes through all input fields unchanged', () => {
    const result = refundable(BASE_OPTION, OPERATOR)

    expect(result.scheme).toBe('escrow')
    expect(result.price).toBe('$0.01')
    expect(result.network).toBe('eip155:84532')
    expect(result.payTo).toBe(BASE_OPTION.payTo)
  })

  it('allows escrowAddress and tokenCollector overrides', () => {
    const result = refundable(BASE_OPTION, OPERATOR, {
      escrowAddress: CUSTOM_ESCROW,
      tokenCollector: CUSTOM_TOKEN_COLLECTOR,
    })

    expect(result.extra.escrowAddress).toBe(CUSTOM_ESCROW)
    expect(result.extra.tokenCollector).toBe(CUSTOM_TOKEN_COLLECTOR)
  })
})
