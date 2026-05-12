import type { PaymentInfoStruct } from '@x402r/evm'
import { describe, expect, it } from 'vitest'
import { toPaymentInfo } from '../src/payment/serialization.js'
import { TEST_ADDRESSES } from './fixtures.js'

const baseStruct: PaymentInfoStruct = {
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

describe('toPaymentInfo', () => {
  it('converts string maxAmount and salt to bigint', () => {
    const result = toPaymentInfo(baseStruct)
    expect(result.maxAmount).toBe(1000000n)
    expect(result.salt).toBe(BigInt('0x3039'))
  })

  it('passes through address and number fields unchanged', () => {
    const result = toPaymentInfo(baseStruct)
    expect(result.operator).toBe(TEST_ADDRESSES.operator)
    expect(result.payer).toBe(TEST_ADDRESSES.payer)
    expect(result.receiver).toBe(TEST_ADDRESSES.receiver)
    expect(result.token).toBe(TEST_ADDRESSES.token)
    expect(result.feeReceiver).toBe(TEST_ADDRESSES.feeReceiver)
    expect(result.minFeeBps).toBe(50)
    expect(result.maxFeeBps).toBe(500)
  })

  it('produces number type for uint48 fields', () => {
    const result = toPaymentInfo(baseStruct)
    expect(typeof result.preApprovalExpiry).toBe('number')
    expect(typeof result.authorizationExpiry).toBe('number')
    expect(typeof result.refundExpiry).toBe('number')
  })

  it('throws on non-numeric maxAmount', () => {
    expect(() =>
      toPaymentInfo({ ...baseStruct, maxAmount: 'not-a-number' }),
    ).toThrow(/maxAmount/)
  })

  it('throws on malformed salt hex', () => {
    expect(() =>
      toPaymentInfo({ ...baseStruct, salt: '0xZZZ' as `0x${string}` }),
    ).toThrow()
  })
})
