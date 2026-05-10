import { isAuthCaptureExtra } from '@x402r/evm'
import { describe, expect, it } from 'vitest'
import { x402rDefaults } from '../src/x402r-defaults.js'

const baseInput = {
  captureAuthorizer: '0x000000000000000000000000000000000000dEaD' as const,
  captureDeadline: 1_999_999_999,
  refundDeadline: 2_999_999_999,
  feeRecipient: '0x000000000000000000000000000000000000bEEF' as const,
  minFeeBps: 0,
  maxFeeBps: 100,
  name: 'USDC',
  version: '2',
}

describe('x402rDefaults', () => {
  it('returns a value satisfying the AuthCaptureExtra type guard', () => {
    expect(isAuthCaptureExtra(x402rDefaults(baseInput))).toBe(true)
  })

  it('passes required fields through unchanged', () => {
    const extra = x402rDefaults(baseInput)
    expect(extra.captureAuthorizer).toBe(baseInput.captureAuthorizer)
    expect(extra.captureDeadline).toBe(baseInput.captureDeadline)
    expect(extra.refundDeadline).toBe(baseInput.refundDeadline)
    expect(extra.feeRecipient).toBe(baseInput.feeRecipient)
    expect(extra.minFeeBps).toBe(baseInput.minFeeBps)
    expect(extra.maxFeeBps).toBe(baseInput.maxFeeBps)
    expect(extra.name).toBe(baseInput.name)
    expect(extra.version).toBe(baseInput.version)
  })

  it('omits autoCapture when not set so facilitator default (false) applies', () => {
    const extra = x402rDefaults(baseInput)
    expect(extra.autoCapture).toBeUndefined()
    expect('autoCapture' in extra).toBe(false)
  })

  it('passes autoCapture through when explicitly true', () => {
    const extra = x402rDefaults({ ...baseInput, autoCapture: true })
    expect(extra.autoCapture).toBe(true)
  })

  it('passes autoCapture through when explicitly false', () => {
    const extra = x402rDefaults({ ...baseInput, autoCapture: false })
    expect(extra.autoCapture).toBe(false)
  })

  it('omits assetTransferMethod when not set so facilitator default (eip3009) applies', () => {
    const extra = x402rDefaults(baseInput)
    expect(extra.assetTransferMethod).toBeUndefined()
    expect('assetTransferMethod' in extra).toBe(false)
  })

  it('passes assetTransferMethod through when explicitly set', () => {
    expect(
      x402rDefaults({ ...baseInput, assetTransferMethod: 'permit2' })
        .assetTransferMethod,
    ).toBe('permit2')
    expect(
      x402rDefaults({ ...baseInput, assetTransferMethod: 'eip3009' })
        .assetTransferMethod,
    ).toBe('eip3009')
  })
})
