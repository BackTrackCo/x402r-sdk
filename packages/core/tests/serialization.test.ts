import type { EscrowPayload } from '@x402r/evm'
import { describe, expect, it } from 'vitest'
import { toPaymentInfo } from '../src/serialization/index.js'

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
