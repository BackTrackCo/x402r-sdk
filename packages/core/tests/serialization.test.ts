import type { EscrowPayload } from '@x402r/evm'
import { describe, expect, it } from 'vitest'
import { toPaymentInfo } from '../src/serialization/index.js'
import { TEST_ADDRESSES } from './fixtures.js'

const basePayload: EscrowPayload = {
  authorization: {
    from: TEST_ADDRESSES.payer,
    to: TEST_ADDRESSES.receiver,
    value: '1000000',
    validAfter: '0',
    validBefore: '1700000000',
    nonce: '0x0000000000000000000000000000000000000000000000000000000000000001',
  },
  signature: '0xdeadbeef',
  paymentInfo: {
    operator: TEST_ADDRESSES.operator,
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
    expect(result.payer).toBe(TEST_ADDRESSES.payer)
  })

  it('passes through address and number fields unchanged', () => {
    const result = toPaymentInfo(basePayload)
    expect(result.operator).toBe(TEST_ADDRESSES.operator)
    expect(result.receiver).toBe(TEST_ADDRESSES.receiver)
    expect(result.token).toBe(TEST_ADDRESSES.token)
    expect(result.feeReceiver).toBe(TEST_ADDRESSES.feeReceiver)
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
