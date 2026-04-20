import type { PaymentRequirements } from '@x402/core/types'
import { describe, expect, it } from 'vitest'
import { Malformed402Error, MaxAmountExceededError } from '../src/errors.js'
import { enforceMaxAmount, pickAccept } from '../src/pay.js'

const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

function accept(
  network: string,
  amount = '10000',
  asset = USDC,
): PaymentRequirements {
  return {
    scheme: 'escrow',
    network: network as PaymentRequirements['network'],
    asset,
    amount,
    payTo: '0x0000000000000000000000000000000000000001',
    maxTimeoutSeconds: 60,
    extra: {},
  }
}

describe('pickAccept', () => {
  it('returns the sole accept when no --chain is passed', () => {
    const a = accept('eip155:84532')
    expect(pickAccept([a], undefined)).toBe(a)
  })

  it('returns the matching accept when --chain is passed', () => {
    const a = accept('eip155:84532')
    const b = accept('eip155:8453')
    expect(pickAccept([a, b], 'eip155:8453')).toBe(b)
  })

  it('throws on empty accepts[]', () => {
    expect(() => pickAccept([], undefined)).toThrow(Malformed402Error)
  })

  it('throws when multiple accepts[] and no --chain filter', () => {
    const a = accept('eip155:84532')
    const b = accept('eip155:8453')
    expect(() => pickAccept([a, b], undefined)).toThrow(
      /pass --chain <eip155:id>/,
    )
  })

  it('throws when --chain matches none of the accepts', () => {
    const a = accept('eip155:84532')
    const b = accept('eip155:8453')
    expect(() => pickAccept([a, b], 'eip155:1')).toThrow(
      /no accepts\[\] entry matches --chain eip155:1/,
    )
  })
})

describe('enforceMaxAmount', () => {
  it('is a no-op when --max-amount is undefined', () => {
    expect(() =>
      enforceMaxAmount(accept('eip155:84532'), undefined),
    ).not.toThrow()
  })

  it('passes when price is below max', () => {
    expect(() =>
      enforceMaxAmount(accept('eip155:84532', '5000'), '10000'),
    ).not.toThrow()
  })

  it('passes when price equals max', () => {
    expect(() =>
      enforceMaxAmount(accept('eip155:84532', '10000'), '10000'),
    ).not.toThrow()
  })

  it('throws when price exceeds max', () => {
    expect(() =>
      enforceMaxAmount(accept('eip155:84532', '10001'), '10000'),
    ).toThrow(MaxAmountExceededError)
  })

  it('throws on non-numeric amount values', () => {
    expect(() =>
      enforceMaxAmount(accept('eip155:84532', 'not-a-number'), '10000'),
    ).toThrow(MaxAmountExceededError)
  })
})
