import { ValidationError } from '@x402r/core/errors'
import { isAuthCaptureExtra } from '@x402r/evm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { x402rDefaults } from '../src/x402r-defaults.js'

// Absolute deadlines opt the output into the AuthCaptureExtra wire shape, so
// this base input is what the type-guard / wire-format assertions build on.
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
  // isAuthCaptureExtra does shape-only checks (typeof per field). It requires
  // the absolute captureDeadline/refundDeadline numbers, so it only passes for
  // the absolute opt-in form below — not the relative-by-default output.
  it('produces an AuthCaptureExtra when absolute deadlines are supplied', () => {
    expect(isAuthCaptureExtra(x402rDefaults(baseInput))).toBe(true)
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

  describe('deadlines', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    const minimalInput = {
      captureAuthorizer: '0x000000000000000000000000000000000000dEaD' as const,
    }

    it('emits relative offsets by default and never reads the wall clock', () => {
      const nowSpy = vi.spyOn(Date, 'now')
      const extra = x402rDefaults(minimalInput)
      expect(extra).toMatchObject({
        captureDeadlineSeconds: 86_400, // 24 hours
        refundDeadlineSeconds: 604_800, // 7 days
      })
      expect('captureDeadline' in extra).toBe(false)
      expect('refundDeadline' in extra).toBe(false)
      // Proves the helper is wall-clock-free, so its output is deterministic.
      expect(nowSpy).not.toHaveBeenCalled()
    })

    it('is deterministic — same input yields deep-equal output', () => {
      expect(x402rDefaults(minimalInput)).toEqual(x402rDefaults(minimalInput))
    })

    it('honors explicit relative offsets over the defaults', () => {
      const extra = x402rDefaults({
        ...minimalInput,
        captureDeadlineSeconds: 30 * 86_400,
        refundDeadlineSeconds: 60 * 86_400,
      })
      expect(extra).toMatchObject({
        captureDeadlineSeconds: 30 * 86_400,
        refundDeadlineSeconds: 60 * 86_400,
      })
      expect('captureDeadline' in extra).toBe(false)
      expect('refundDeadline' in extra).toBe(false)
    })

    it('emits both absolute when both are supplied', () => {
      const extra = x402rDefaults({
        ...minimalInput,
        captureDeadline: 1_999_999_999,
        refundDeadline: 2_999_999_999,
      })
      expect(extra).toMatchObject({
        captureDeadline: 1_999_999_999,
        refundDeadline: 2_999_999_999,
      })
      expect('captureDeadlineSeconds' in extra).toBe(false)
      expect('refundDeadlineSeconds' in extra).toBe(false)
    })

    it('resolves capture and refund independently — absolute capture, relative refund', () => {
      const extra = x402rDefaults({
        ...minimalInput,
        captureDeadline: 1_999_999_999,
      })
      expect('captureDeadline' in extra).toBe(true)
      expect('captureDeadlineSeconds' in extra).toBe(false)
      // Refund falls back to its relative default.
      expect(extra).toMatchObject({
        captureDeadline: 1_999_999_999,
        refundDeadlineSeconds: 604_800,
      })
      expect('refundDeadline' in extra).toBe(false)
    })

    it('resolves capture and refund independently — relative capture, absolute refund', () => {
      const extra = x402rDefaults({
        ...minimalInput,
        refundDeadline: 2_999_999_999,
      })
      expect('refundDeadline' in extra).toBe(true)
      expect('refundDeadlineSeconds' in extra).toBe(false)
      // Capture falls back to its relative default.
      expect(extra).toMatchObject({
        refundDeadline: 2_999_999_999,
        captureDeadlineSeconds: 86_400,
      })
      expect('captureDeadline' in extra).toBe(false)
    })

    it('throws when both absolute and refundDeadline < captureDeadline', () => {
      expect(() =>
        x402rDefaults({
          ...minimalInput,
          captureDeadline: 2_999_999_999,
          refundDeadline: 1_999_999_999,
        }),
      ).toThrow(ValidationError)
    })

    it('throws when both relative and refundDeadlineSeconds < captureDeadlineSeconds', () => {
      expect(() =>
        x402rDefaults({
          ...minimalInput,
          captureDeadlineSeconds: 604_800,
          refundDeadlineSeconds: 86_400,
        }),
      ).toThrow(ValidationError)
    })

    it('throws when captureDeadlineSeconds is 0', () => {
      // A non-positive relative offset resolves to a deadline at or before now.
      expect(() =>
        x402rDefaults({ ...minimalInput, captureDeadlineSeconds: 0 }),
      ).toThrow(ValidationError)
    })

    it('throws when captureDeadlineSeconds is negative', () => {
      expect(() =>
        x402rDefaults({ ...minimalInput, captureDeadlineSeconds: -1 }),
      ).toThrow(ValidationError)
    })

    it('throws when refundDeadlineSeconds is 0', () => {
      expect(() =>
        x402rDefaults({ ...minimalInput, refundDeadlineSeconds: 0 }),
      ).toThrow(ValidationError)
    })

    it('throws when refundDeadlineSeconds is negative', () => {
      expect(() =>
        x402rDefaults({ ...minimalInput, refundDeadlineSeconds: -1 }),
      ).toThrow(ValidationError)
    })

    it('throws when captureDeadlineSeconds is NaN', () => {
      // NaN <= 0 is false, so the integer guard is what rejects it; left
      // through, NaN serializes to null on the wire (silent corruption).
      expect(() =>
        x402rDefaults({ ...minimalInput, captureDeadlineSeconds: NaN }),
      ).toThrow(ValidationError)
    })

    it('throws when refundDeadlineSeconds is NaN', () => {
      expect(() =>
        x402rDefaults({ ...minimalInput, refundDeadlineSeconds: NaN }),
      ).toThrow(ValidationError)
    })

    it('throws when captureDeadlineSeconds is fractional', () => {
      // Deadlines are integer seconds (uint48 on-chain), so fractional offsets
      // are invalid input.
      expect(() =>
        x402rDefaults({ ...minimalInput, captureDeadlineSeconds: 0.5 }),
      ).toThrow(ValidationError)
    })

    it('throws when refundDeadlineSeconds is fractional', () => {
      expect(() =>
        x402rDefaults({ ...minimalInput, refundDeadlineSeconds: 0.5 }),
      ).toThrow(ValidationError)
    })

    it('absolute captureDeadline wins over captureDeadlineSeconds when both set', () => {
      const extra = x402rDefaults({
        ...minimalInput,
        captureDeadline: 1_999_999_999,
        captureDeadlineSeconds: 60,
      })
      expect(extra).toMatchObject({ captureDeadline: 1_999_999_999 })
      expect('captureDeadlineSeconds' in extra).toBe(false)
    })

    it('absolute refundDeadline wins over refundDeadlineSeconds when both set', () => {
      const extra = x402rDefaults({
        ...minimalInput,
        refundDeadline: 2_999_999_999,
        refundDeadlineSeconds: 60,
      })
      expect(extra).toMatchObject({ refundDeadline: 2_999_999_999 })
      expect('refundDeadlineSeconds' in extra).toBe(false)
    })

    it('does not throw for a mixed shape even when values look out of order', () => {
      // Absolute capture + relative refund: not comparable without the wall
      // clock, so the helper defers ordering validation to the facilitator.
      expect(() =>
        x402rDefaults({
          ...minimalInput,
          captureDeadline: 2_999_999_999,
          refundDeadlineSeconds: 60,
        }),
      ).not.toThrow()
    })
  })

  describe('non-deadline defaults', () => {
    const minimalInput = {
      captureAuthorizer: '0x000000000000000000000000000000000000dEaD' as const,
    }

    it('defaults feeRecipient to captureAuthorizer', () => {
      const extra = x402rDefaults(minimalInput)
      expect(extra.feeRecipient).toBe(minimalInput.captureAuthorizer)
    })

    it('passes explicit feeRecipient through unchanged when set', () => {
      const extra = x402rDefaults({
        ...minimalInput,
        feeRecipient: '0x000000000000000000000000000000000000bEEF',
      })
      expect(extra.feeRecipient).toBe(
        '0x000000000000000000000000000000000000bEEF',
      )
    })

    it('defaults minFeeBps to 0 and maxFeeBps to 100', () => {
      const extra = x402rDefaults(minimalInput)
      expect(extra.minFeeBps).toBe(0)
      expect(extra.maxFeeBps).toBe(100)
    })

    it('defaults token domain to USDC / 2', () => {
      const extra = x402rDefaults(minimalInput)
      expect(extra.name).toBe('USDC')
      expect(extra.version).toBe('2')
    })
  })
})
