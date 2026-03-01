import type { EscrowPayload } from '@x402r/evm/escrow/types'
import { describe, expect, it } from 'vitest'
import { ValidationError } from '../src/errors/index.js'
import { parsePaymentInfo, toPaymentInfo } from '../src/serialization/index.js'
import type { PaymentInfo } from '../src/types/index.js'

// ---------------------------------------------------------------------------
// parsePaymentInfo
// ---------------------------------------------------------------------------

const validPaymentInfoObj = {
  operator: '0x1234567890123456789012345678901234567890',
  payer: '0x2345678901234567890123456789012345678901',
  receiver: '0x3456789012345678901234567890123456789012',
  token: '0x4567890123456789012345678901234567890123',
  maxAmount: '1000000',
  preApprovalExpiry: '1735689600',
  authorizationExpiry: '1735689600',
  refundExpiry: '1738368000',
  minFeeBps: 0,
  maxFeeBps: 500,
  feeReceiver: '0x5678901234567890123456789012345678901234',
  salt: '123456789',
}

describe('parsePaymentInfo', () => {
  it('parses a JSON string into PaymentInfo', () => {
    const json = JSON.stringify(validPaymentInfoObj)
    const result = parsePaymentInfo(json)

    expect(result.operator).toBe(validPaymentInfoObj.operator)
    expect(result.payer).toBe(validPaymentInfoObj.payer)
    expect(result.receiver).toBe(validPaymentInfoObj.receiver)
    expect(result.token).toBe(validPaymentInfoObj.token)
    expect(result.maxAmount).toBe(1000000n)
    expect(result.preApprovalExpiry).toBe(1735689600)
    expect(result.authorizationExpiry).toBe(1735689600)
    expect(result.refundExpiry).toBe(1738368000)
    expect(result.minFeeBps).toBe(0)
    expect(result.maxFeeBps).toBe(500)
    expect(result.feeReceiver).toBe(validPaymentInfoObj.feeReceiver)
    expect(result.salt).toBe(123456789n)
  })

  it('parses a plain object into PaymentInfo', () => {
    const result = parsePaymentInfo(validPaymentInfoObj)
    expect(result.maxAmount).toBe(1000000n)
    expect(result.salt).toBe(123456789n)
  })

  it('defaults optional expiry fields to 0', () => {
    const { preApprovalExpiry, authorizationExpiry, refundExpiry, ...rest } =
      validPaymentInfoObj
    const result = parsePaymentInfo(rest)
    expect(result.preApprovalExpiry).toBe(0)
    expect(result.authorizationExpiry).toBe(0)
    expect(result.refundExpiry).toBe(0)
  })

  it('defaults optional fee fields to 0', () => {
    const { minFeeBps, maxFeeBps, ...rest } = validPaymentInfoObj
    const result = parsePaymentInfo(rest)
    expect(result.minFeeBps).toBe(0)
    expect(result.maxFeeBps).toBe(0)
  })

  it('throws ValidationError for missing required field', () => {
    const { operator, ...rest } = validPaymentInfoObj
    expect(() => parsePaymentInfo(rest)).toThrow(ValidationError)
    expect(() => parsePaymentInfo(rest)).toThrow(
      "Missing required PaymentInfo field: 'operator'",
    )
  })

  it('throws for missing maxAmount', () => {
    const { maxAmount, ...rest } = validPaymentInfoObj
    expect(() => parsePaymentInfo(rest)).toThrow(
      "Missing required PaymentInfo field: 'maxAmount'",
    )
  })

  it('throws for missing salt', () => {
    const { salt, ...rest } = validPaymentInfoObj
    expect(() => parsePaymentInfo(rest)).toThrow(
      "Missing required PaymentInfo field: 'salt'",
    )
  })

  it('round-trips correctly', () => {
    const original: PaymentInfo = {
      operator: '0x1234567890123456789012345678901234567890',
      payer: '0x2345678901234567890123456789012345678901',
      receiver: '0x3456789012345678901234567890123456789012',
      token: '0x4567890123456789012345678901234567890123',
      maxAmount: 1000000n,
      preApprovalExpiry: 1735689600,
      authorizationExpiry: 1735689600,
      refundExpiry: 1738368000,
      minFeeBps: 0,
      maxFeeBps: 500,
      feeReceiver: '0x5678901234567890123456789012345678901234',
      salt: 123456789n,
    }

    const json = JSON.stringify(original, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v,
    )
    const parsed = parsePaymentInfo(json)

    expect(parsed.operator).toBe(original.operator)
    expect(parsed.maxAmount).toBe(original.maxAmount)
    expect(parsed.preApprovalExpiry).toBe(original.preApprovalExpiry)
    expect(parsed.salt).toBe(original.salt)
  })

  it('produces number type for uint48 fields', () => {
    const result = parsePaymentInfo(validPaymentInfoObj)
    expect(typeof result.preApprovalExpiry).toBe('number')
    expect(typeof result.authorizationExpiry).toBe('number')
    expect(typeof result.refundExpiry).toBe('number')
  })
})

// ---------------------------------------------------------------------------
// toPaymentInfo
// ---------------------------------------------------------------------------

const basePayload: EscrowPayload = {
  authorization: {
    from: '0xPayerAddress0000000000000000000000000001',
    to: '0xReceiverAddr000000000000000000000000001',
    value: '1000000',
    validAfter: '0',
    validBefore: '1700000000',
    nonce: '0x0000000000000000000000000000000000000000000000000000000000000001',
  },
  signature: '0xdeadbeef',
  paymentInfo: {
    operator: '0xOperatorAddr000000000000000000000000001',
    receiver: '0xReceiverAddr000000000000000000000000001',
    token: '0xTokenAddress00000000000000000000000000001',
    maxAmount: '1000000',
    preApprovalExpiry: 1700000000,
    authorizationExpiry: 1700001000,
    refundExpiry: 1700002000,
    minFeeBps: 50,
    maxFeeBps: 500,
    feeReceiver: '0xFeeReceiverA000000000000000000000000001',
    salt: '0x3039',
  },
}

describe('toPaymentInfo', () => {
  it('converts string maxAmount and salt to bigint', () => {
    const result = toPaymentInfo(basePayload)
    expect(result.maxAmount).toBe(1000000n)
    expect(result.salt).toBe(BigInt('0x3039'))
  })

  it('extracts payer from authorization.from', () => {
    const result = toPaymentInfo(basePayload)
    expect(result.payer).toBe('0xPayerAddress0000000000000000000000000001')
  })

  it('passes through address and number fields unchanged', () => {
    const result = toPaymentInfo(basePayload)
    expect(result.operator).toBe('0xOperatorAddr000000000000000000000000001')
    expect(result.receiver).toBe('0xReceiverAddr000000000000000000000000001')
    expect(result.token).toBe('0xTokenAddress00000000000000000000000000001')
    expect(result.feeReceiver).toBe('0xFeeReceiverA000000000000000000000000001')
    expect(result.minFeeBps).toBe(50)
    expect(result.maxFeeBps).toBe(500)
  })

  it('produces number type for uint48 fields', () => {
    const result = toPaymentInfo(basePayload)
    expect(typeof result.preApprovalExpiry).toBe('number')
    expect(typeof result.authorizationExpiry).toBe('number')
    expect(typeof result.refundExpiry).toBe('number')
  })
})
