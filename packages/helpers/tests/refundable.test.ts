import { ConfigError, ValidationError } from '@x402r/core/errors'
import { describe, expect, it } from 'vitest'
import { refundable } from '../src/index.js'

// Known Base Sepolia addresses from chain config
const BASE_SEPOLIA_ESCROW = '0xe050bB89eD43BB02d71343063824614A7fb80B77'
const BASE_SEPOLIA_TOKEN_COLLECTOR =
  '0xcE66Ab399EDA513BD12760b6427C87D6602344a7'

describe('refundable', () => {
  const operatorAddress =
    '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as `0x${string}`

  const baseOption = {
    scheme: 'escrow',
    network: 'eip155:84532',
    payTo: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
    price: '$0.01',
  }

  it('populates extra with chain config addresses', () => {
    const result = refundable(baseOption, operatorAddress)

    expect(result.extra.escrowAddress).toBe(BASE_SEPOLIA_ESCROW)
    expect(result.extra.tokenCollector).toBe(BASE_SEPOLIA_TOKEN_COLLECTOR)
    expect(result.extra.operatorAddress).toBe(operatorAddress)
  })

  it('applies default fee bounds when no options provided', () => {
    const result = refundable(baseOption, operatorAddress)

    expect(result.extra.minFeeBps).toBe(0)
    expect(result.extra.maxFeeBps).toBe(1000)
  })

  it('uses custom fee bounds from options', () => {
    const result = refundable(baseOption, operatorAddress, {
      minFeeBps: 100,
      maxFeeBps: 500,
    })

    expect(result.extra.minFeeBps).toBe(100)
    expect(result.extra.maxFeeBps).toBe(500)
  })

  it('uses custom escrowAddress and tokenCollector from options', () => {
    const customEscrow =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`
    const customCollector =
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`

    const result = refundable(baseOption, operatorAddress, {
      escrowAddress: customEscrow,
      tokenCollector: customCollector,
    })

    expect(result.extra.escrowAddress).toBe(customEscrow)
    expect(result.extra.tokenCollector).toBe(customCollector)
  })

  it('preserves existing extra fields from the input option', () => {
    const optionWithExtra = {
      ...baseOption,
      extra: { foo: 'bar', customField: 42 },
    }

    const result = refundable(optionWithExtra, operatorAddress)

    expect(result.extra.foo).toBe('bar')
    expect(result.extra.customField).toBe(42)
    // Escrow fields are also present
    expect(result.extra.escrowAddress).toBe(BASE_SEPOLIA_ESCROW)
    expect(result.extra.operatorAddress).toBe(operatorAddress)
  })

  it('preserves all original option fields', () => {
    const result = refundable(baseOption, operatorAddress)

    expect(result.scheme).toBe('escrow')
    expect(result.network).toBe('eip155:84532')
    expect(result.payTo).toBe(baseOption.payTo)
    expect(result.price).toBe('$0.01')
  })

  it('resolves addresses for Ethereum Sepolia (eip155:11155111)', () => {
    const ethSepoliaOption = {
      scheme: 'escrow',
      network: 'eip155:11155111',
    }

    const result = refundable(ethSepoliaOption, operatorAddress)

    // Same CREATE3 addresses across all chains
    expect(result.extra.escrowAddress).toBe(BASE_SEPOLIA_ESCROW)
    expect(result.extra.tokenCollector).toBe(BASE_SEPOLIA_TOKEN_COLLECTOR)
  })

  // --- Validation errors -------------------------------------------------

  it('throws ValidationError when minFeeBps > maxFeeBps', () => {
    expect(() =>
      refundable(baseOption, operatorAddress, {
        minFeeBps: 500,
        maxFeeBps: 100,
      }),
    ).toThrow(ValidationError)
  })

  it('throws ValidationError when maxFeeBps > 10000', () => {
    expect(() =>
      refundable(baseOption, operatorAddress, {
        maxFeeBps: 10001,
      }),
    ).toThrow(ValidationError)
  })

  it('throws ValidationError when minFeeBps is negative', () => {
    expect(() =>
      refundable(baseOption, operatorAddress, {
        minFeeBps: -1,
      }),
    ).toThrow(ValidationError)
  })

  it('throws ValidationError when maxFeeBps is negative', () => {
    expect(() =>
      refundable(baseOption, operatorAddress, {
        maxFeeBps: -5,
      }),
    ).toThrow(ValidationError)
  })

  // --- settlementMethod ---------------------------------------------------

  it('sets settlementMethod to authorize by default', () => {
    const result = refundable(baseOption, operatorAddress)
    expect(result.extra.settlementMethod).toBe('authorize')
  })

  it('allows overriding settlementMethod to charge', () => {
    const result = refundable(baseOption, operatorAddress, {
      settlementMethod: 'charge',
    })
    expect(result.extra.settlementMethod).toBe('charge')
  })

  // --- postCaptureRefundDeadline -----------------------------------------

  it('converts postCaptureRefundDeadline to a future absolute timestamp', () => {
    const thirtyDays = 30 * 24 * 3600
    const before = Math.floor(Date.now() / 1000)
    const result = refundable(baseOption, operatorAddress, {
      postCaptureRefundDeadline: thirtyDays,
    })
    const after = Math.floor(Date.now() / 1000)

    expect(result.extra.refundExpirySeconds).toBeGreaterThanOrEqual(
      before + thirtyDays,
    )
    expect(result.extra.refundExpirySeconds).toBeLessThanOrEqual(
      after + thirtyDays,
    )
  })

  it('omits refundExpirySeconds when postCaptureRefundDeadline not provided', () => {
    const result = refundable(baseOption, operatorAddress)
    expect(result.extra.refundExpirySeconds).toBeUndefined()
  })

  it('throws ValidationError for non-positive postCaptureRefundDeadline', () => {
    expect(() =>
      refundable(baseOption, operatorAddress, { postCaptureRefundDeadline: 0 }),
    ).toThrow(ValidationError)
    expect(() =>
      refundable(baseOption, operatorAddress, {
        postCaptureRefundDeadline: -100,
      }),
    ).toThrow(ValidationError)
  })

  it('output extra contains scheme-compatible field names', () => {
    const result = refundable(baseOption, operatorAddress, {
      settlementMethod: 'charge',
      postCaptureRefundDeadline: 3600,
    })
    expect(result.extra).toHaveProperty('escrowAddress')
    expect(result.extra).toHaveProperty('operatorAddress')
    expect(result.extra).toHaveProperty('tokenCollector')
    expect(result.extra).toHaveProperty('settlementMethod')
    expect(result.extra).toHaveProperty('refundExpirySeconds')
  })

  // --- Config errors -----------------------------------------------------

  it('throws ConfigError for unsupported network', () => {
    const unsupportedOption = {
      scheme: 'escrow',
      network: 'eip155:999999',
    }

    expect(() => refundable(unsupportedOption, operatorAddress)).toThrow(
      ConfigError,
    )
  })

  it('throws ConfigError for invalid CAIP-2 network string', () => {
    const badNetworkOption = {
      scheme: 'escrow',
      network: 'not-a-valid-network',
    }

    expect(() => refundable(badNetworkOption, operatorAddress)).toThrow(
      ConfigError,
    )
  })
})
