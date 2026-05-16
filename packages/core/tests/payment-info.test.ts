import { describe, expect, it } from 'vitest'
import { ValidationError } from '../src/errors/index.js'
import { PaymentInfo, type PaymentInfoWire } from '../src/types/index.js'

const TEST_ADDRESSES = {
  operator: '0x1111111111111111111111111111111111111111',
  payer: '0x2222222222222222222222222222222222222222',
  receiver: '0x3333333333333333333333333333333333333333',
  token: '0x4444444444444444444444444444444444444444',
  feeReceiver: '0x5555555555555555555555555555555555555555',
} as const

const baseWire: PaymentInfoWire = {
  operator: TEST_ADDRESSES.operator,
  payer: TEST_ADDRESSES.payer,
  receiver: TEST_ADDRESSES.receiver,
  token: TEST_ADDRESSES.token,
  maxAmount: '1000000',
  preApprovalExpiry: 1700000000,
  authorizationExpiry: 1700001000,
  refundExpiry: 1700002000,
  minFeeBps: 50,
  maxFeeBps: 500,
  feeReceiver: TEST_ADDRESSES.feeReceiver,
  salt: '0x3039',
}

describe('PaymentInfo.fromWire', () => {
  it('converts string maxAmount and salt to bigint', () => {
    const info = PaymentInfo.fromWire(baseWire)
    expect(info.maxAmount).toBe(1000000n)
    expect(info.salt).toBe(BigInt('0x3039'))
  })

  it('passes through address and number fields unchanged', () => {
    const info = PaymentInfo.fromWire(baseWire)
    expect(info.operator).toBe(TEST_ADDRESSES.operator)
    expect(info.payer).toBe(TEST_ADDRESSES.payer)
    expect(info.receiver).toBe(TEST_ADDRESSES.receiver)
    expect(info.token).toBe(TEST_ADDRESSES.token)
    expect(info.feeReceiver).toBe(TEST_ADDRESSES.feeReceiver)
    expect(info.minFeeBps).toBe(50)
    expect(info.maxFeeBps).toBe(500)
  })

  it('produces number type for uint48 fields', () => {
    const info = PaymentInfo.fromWire(baseWire)
    expect(typeof info.preApprovalExpiry).toBe('number')
    expect(typeof info.authorizationExpiry).toBe('number')
    expect(typeof info.refundExpiry).toBe('number')
  })

  it('throws ValidationError on non-numeric maxAmount', () => {
    expect(() =>
      PaymentInfo.fromWire({ ...baseWire, maxAmount: 'not-a-number' }),
    ).toThrow(ValidationError)
    expect(() =>
      PaymentInfo.fromWire({ ...baseWire, maxAmount: 'not-a-number' }),
    ).toThrow(/maxAmount/)
  })

  it('throws ValidationError on malformed salt hex', () => {
    expect(() =>
      PaymentInfo.fromWire({
        ...baseWire,
        salt: '0xZZZ' as `0x${string}`,
      }),
    ).toThrow(ValidationError)
    expect(() =>
      PaymentInfo.fromWire({
        ...baseWire,
        salt: '0xZZZ' as `0x${string}`,
      }),
    ).toThrow(/salt/)
  })
})

describe('PaymentInfo.toWire', () => {
  it('converts bigint maxAmount and salt to strings', () => {
    const wire = PaymentInfo.toWire(PaymentInfo.fromWire(baseWire))
    expect(typeof wire.maxAmount).toBe('string')
    expect(typeof wire.salt).toBe('string')
    expect(wire.maxAmount).toBe('1000000')
    expect(wire.salt).toBe('0x3039')
  })

  it('passes through address and number fields unchanged', () => {
    const wire = PaymentInfo.toWire(PaymentInfo.fromWire(baseWire))
    expect(wire.operator).toBe(TEST_ADDRESSES.operator)
    expect(wire.payer).toBe(TEST_ADDRESSES.payer)
    expect(wire.receiver).toBe(TEST_ADDRESSES.receiver)
    expect(wire.token).toBe(TEST_ADDRESSES.token)
    expect(wire.feeReceiver).toBe(TEST_ADDRESSES.feeReceiver)
    expect(wire.minFeeBps).toBe(50)
    expect(wire.maxFeeBps).toBe(500)
    expect(wire.preApprovalExpiry).toBe(1700000000)
    expect(wire.authorizationExpiry).toBe(1700001000)
    expect(wire.refundExpiry).toBe(1700002000)
  })

  it('emits salt as 0x-prefixed hex even for small values', () => {
    const wire = PaymentInfo.toWire({
      ...PaymentInfo.fromWire(baseWire),
      salt: 1n,
    })
    expect(wire.salt).toBe('0x1')
  })

  it('round-trips fromWire → toWire → fromWire deterministically', () => {
    const once = PaymentInfo.fromWire(baseWire)
    const wired = PaymentInfo.toWire(once)
    const twice = PaymentInfo.fromWire(wired)
    expect(twice).toEqual(once)
  })
})
