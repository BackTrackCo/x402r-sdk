import type { PaymentRequirements } from '@x402/core/types'
import { describe, expect, it } from 'vitest'
import { Malformed402Error, MaxAmountExceededError } from '../src/errors.js'
import { enforceMaxAmount, pickAccept } from '../src/pay/policy.js'

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

function withTransferMethod(
  base: PaymentRequirements,
  method: 'eip3009' | 'permit2',
): PaymentRequirements {
  return { ...base, extra: { ...base.extra, assetTransferMethod: method } }
}

describe('pickAccept', () => {
  it('returns the sole accept when no filter is passed', () => {
    const a = accept('eip155:84532')
    expect(pickAccept([a], {})).toBe(a)
  })

  it('returns the matching accept when --chain is passed', () => {
    const a = accept('eip155:84532')
    const b = accept('eip155:8453')
    expect(pickAccept([a, b], { chain: 'eip155:8453' })).toBe(b)
  })

  it('throws on empty accepts[]', () => {
    expect(() => pickAccept([], {})).toThrow(Malformed402Error)
  })

  it('throws when multiple accepts[] and no --chain filter', () => {
    const a = accept('eip155:84532')
    const b = accept('eip155:8453')
    expect(() => pickAccept([a, b], {})).toThrow(/pass --chain <eip155:id>/)
  })

  it('throws when --chain matches none of the accepts', () => {
    const a = accept('eip155:84532')
    const b = accept('eip155:8453')
    expect(() => pickAccept([a, b], { chain: 'eip155:1' })).toThrow(
      /no accepts\[\] entry matches --chain eip155:1/,
    )
  })

  it('returns the matching accept when --asset-transfer-method is passed', () => {
    const a = withTransferMethod(accept('eip155:84532'), 'eip3009')
    const b = withTransferMethod(accept('eip155:84532'), 'permit2')
    expect(pickAccept([a, b], { assetTransferMethod: 'permit2' })).toBe(b)
  })

  it('throws when --asset-transfer-method matches none of the accepts', () => {
    const a = withTransferMethod(accept('eip155:84532'), 'eip3009')
    expect(() => pickAccept([a], { assetTransferMethod: 'permit2' })).toThrow(
      /no accepts\[\] entry matches --asset-transfer-method=permit2/,
    )
  })

  it('combines --chain and --asset-transfer-method filters', () => {
    const a = withTransferMethod(accept('eip155:84532'), 'eip3009')
    const b = withTransferMethod(accept('eip155:84532'), 'permit2')
    const c = withTransferMethod(accept('eip155:8453'), 'permit2')
    expect(
      pickAccept([a, b, c], {
        chain: 'eip155:8453',
        assetTransferMethod: 'permit2',
      }),
    ).toBe(c)
  })

  it('rejects invalid --asset-transfer-method values', () => {
    const a = accept('eip155:84532')
    expect(() =>
      pickAccept([a], { assetTransferMethod: 'unsupported' }),
    ).toThrow(/--asset-transfer-method must be 'eip3009' or 'permit2'/)
  })

  it('treats missing extra.assetTransferMethod as eip3009 for filtering', () => {
    // Wire format pre-PR 2 or facilitators that omit the field default to EIP-3009.
    const a = accept('eip155:84532') // extra: {} → no assetTransferMethod
    expect(pickAccept([a], { assetTransferMethod: 'eip3009' })).toBe(a)
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
