import { describe, expect, it } from 'vitest'
import { ValidationError } from '../src/errors/index.js'
import { validatePaymentInfo } from '../src/validation/index.js'
import { makePaymentInfo, zeroAddress } from './fixtures.js'

const futureTimestamp = Math.floor(Date.now() / 1000) + 3600
const validOverrides = {
  preApprovalExpiry: futureTimestamp,
  authorizationExpiry: futureTimestamp,
  refundExpiry: futureTimestamp + 86400,
}

describe('validatePaymentInfo', () => {
  it('does not throw for valid PaymentInfo', () => {
    expect(() =>
      validatePaymentInfo(makePaymentInfo(validOverrides)),
    ).not.toThrow()
  })

  it('throws for zero operator', () => {
    expect(() =>
      validatePaymentInfo(
        makePaymentInfo({ ...validOverrides, operator: zeroAddress }),
      ),
    ).toThrow(ValidationError)
  })

  it('throws for zero receiver', () => {
    expect(() =>
      validatePaymentInfo(
        makePaymentInfo({ ...validOverrides, receiver: zeroAddress }),
      ),
    ).toThrow(ValidationError)
  })

  it('throws for zero token', () => {
    expect(() =>
      validatePaymentInfo(
        makePaymentInfo({ ...validOverrides, token: zeroAddress }),
      ),
    ).toThrow(ValidationError)
  })

  it('throws for zero feeReceiver', () => {
    expect(() =>
      validatePaymentInfo(
        makePaymentInfo({ ...validOverrides, feeReceiver: zeroAddress }),
      ),
    ).toThrow(ValidationError)
  })

  it('throws for zero maxAmount', () => {
    expect(() =>
      validatePaymentInfo(
        makePaymentInfo({ ...validOverrides, maxAmount: 0n }),
      ),
    ).toThrow(ValidationError)
  })

  it('throws when minFeeBps > maxFeeBps', () => {
    expect(() =>
      validatePaymentInfo(
        makePaymentInfo({
          ...validOverrides,
          minFeeBps: 500,
          maxFeeBps: 100,
        }),
      ),
    ).toThrow(ValidationError)
  })

  it('throws when maxFeeBps > 10000', () => {
    expect(() =>
      validatePaymentInfo(
        makePaymentInfo({ ...validOverrides, maxFeeBps: 15000 }),
      ),
    ).toThrow(ValidationError)
  })

  it('throws for expired authorizationExpiry', () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 3600
    expect(() =>
      validatePaymentInfo(
        makePaymentInfo({
          ...validOverrides,
          authorizationExpiry: pastTimestamp,
        }),
      ),
    ).toThrow(ValidationError)
  })

  it('throws for expired preApprovalExpiry', () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 3600
    expect(() =>
      validatePaymentInfo(
        makePaymentInfo({
          ...validOverrides,
          preApprovalExpiry: pastTimestamp,
        }),
      ),
    ).toThrow(ValidationError)
  })

  it('does not throw when preApprovalExpiry is zero', () => {
    expect(() =>
      validatePaymentInfo(
        makePaymentInfo({ ...validOverrides, preApprovalExpiry: 0 }),
      ),
    ).not.toThrow()
  })

  it('allows payer to be zero address (payer-agnostic)', () => {
    expect(() =>
      validatePaymentInfo(
        makePaymentInfo({ ...validOverrides, payer: zeroAddress }),
      ),
    ).not.toThrow()
  })

  it('throws for expired refundExpiry', () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 3600
    expect(() =>
      validatePaymentInfo(
        makePaymentInfo({ ...validOverrides, refundExpiry: pastTimestamp }),
      ),
    ).toThrow(ValidationError)
  })

  it('does not throw when refundExpiry is zero', () => {
    expect(() =>
      validatePaymentInfo(
        makePaymentInfo({ ...validOverrides, refundExpiry: 0 }),
      ),
    ).not.toThrow()
  })
})
