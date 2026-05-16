import { ValidationError } from '@x402r/core/errors'
import { describe, expect, it } from 'vitest'
import { reconstructPaymentInfoWire } from '../src/reconstruct-payment-info.js'

const TEST_ADDRESSES = {
  captureAuthorizer: '0x1111111111111111111111111111111111111111',
  payer: '0x2222222222222222222222222222222222222222',
  payTo: '0x3333333333333333333333333333333333333333',
  asset: '0x4444444444444444444444444444444444444444',
  feeRecipient: '0x5555555555555555555555555555555555555555',
} as const

const BASE_EXTRA = {
  captureAuthorizer: TEST_ADDRESSES.captureAuthorizer,
  captureDeadline: 1700001000,
  refundDeadline: 1700002000,
  feeRecipient: TEST_ADDRESSES.feeRecipient,
  minFeeBps: 50,
  maxFeeBps: 500,
  name: 'USDC',
  version: '2',
}

const BASE_REQUIREMENTS = {
  scheme: 'authCapture',
  network: 'eip155:84532',
  payTo: TEST_ADDRESSES.payTo,
  asset: TEST_ADDRESSES.asset,
  amount: '1000000',
  extra: BASE_EXTRA,
}

const EIP3009_PAYLOAD = {
  authorization: {
    from: TEST_ADDRESSES.payer,
    to: '0x6666666666666666666666666666666666666666',
    value: '1000000',
    validAfter: '0',
    validBefore: '1699999000',
    nonce: '0xabcd',
  },
  signature: '0xdeadbeef',
  salt: '0x3039',
}

const PERMIT2_PAYLOAD = {
  permit2Authorization: {
    from: TEST_ADDRESSES.payer,
    permitted: {
      token: TEST_ADDRESSES.asset,
      amount: '1000000',
    },
    spender: '0x7777777777777777777777777777777777777777',
    nonce: '1234',
    deadline: '1699999500',
  },
  signature: '0xdeadbeef',
  salt: '0x3039',
}

function makeContext(overrides: {
  payload?: unknown
  extra?: unknown
  payer?: string
  amount?: string
}) {
  return {
    paymentPayload: {
      x402Version: 2,
      accepted: { scheme: 'authCapture', network: 'eip155:84532' },
      payload: overrides.payload ?? EIP3009_PAYLOAD,
    },
    requirements: {
      ...BASE_REQUIREMENTS,
      amount: overrides.amount ?? BASE_REQUIREMENTS.amount,
      extra: overrides.extra === undefined ? BASE_EXTRA : overrides.extra,
    },
    result: {
      success: true,
      transaction: '0xabc',
      network: 'eip155:84532',
      payer: overrides.payer ?? TEST_ADDRESSES.payer,
    },
    declaredExtensions: {},
  } as Parameters<typeof reconstructPaymentInfoWire>[0]
}

describe('reconstructPaymentInfoWire', () => {
  it('builds the wire-form record from an EIP-3009 settle result', () => {
    const struct = reconstructPaymentInfoWire(makeContext({}))

    expect(struct.operator).toBe(TEST_ADDRESSES.captureAuthorizer)
    expect(struct.payer).toBe(TEST_ADDRESSES.payer)
    expect(struct.receiver).toBe(TEST_ADDRESSES.payTo)
    expect(struct.token).toBe(TEST_ADDRESSES.asset)
    expect(struct.maxAmount).toBe('1000000')
    expect(struct.preApprovalExpiry).toBe(1699999000)
    expect(struct.authorizationExpiry).toBe(1700001000)
    expect(struct.refundExpiry).toBe(1700002000)
    expect(struct.minFeeBps).toBe(50)
    expect(struct.maxFeeBps).toBe(500)
    expect(struct.feeReceiver).toBe(TEST_ADDRESSES.feeRecipient)
    expect(struct.salt).toBe('0x3039')
  })

  it('pulls preApprovalExpiry from authorization.validBefore for EIP-3009', () => {
    const struct = reconstructPaymentInfoWire(
      makeContext({
        payload: {
          ...EIP3009_PAYLOAD,
          authorization: {
            ...EIP3009_PAYLOAD.authorization,
            validBefore: '1700123456',
          },
        },
      }),
    )

    expect(struct.preApprovalExpiry).toBe(1700123456)
  })

  it('pulls preApprovalExpiry from permit2Authorization.deadline for Permit2', () => {
    const struct = reconstructPaymentInfoWire(
      makeContext({ payload: PERMIT2_PAYLOAD }),
    )

    expect(struct.preApprovalExpiry).toBe(1699999500)
    expect(struct.salt).toBe('0x3039')
    // Other field mappings should still hold for Permit2
    expect(struct.operator).toBe(TEST_ADDRESSES.captureAuthorizer)
    expect(struct.receiver).toBe(TEST_ADDRESSES.payTo)
  })

  it('throws ValidationError when extra is not AuthCaptureExtra', () => {
    expect(() =>
      reconstructPaymentInfoWire(makeContext({ extra: { foo: 'bar' } })),
    ).toThrow(ValidationError)
    expect(() =>
      reconstructPaymentInfoWire(makeContext({ extra: { foo: 'bar' } })),
    ).toThrow(/AuthCaptureExtra/)
  })

  it('throws ValidationError when payload is not AuthCapturePayload', () => {
    expect(() =>
      reconstructPaymentInfoWire(makeContext({ payload: { random: 'shape' } })),
    ).toThrow(ValidationError)
    expect(() =>
      reconstructPaymentInfoWire(makeContext({ payload: { random: 'shape' } })),
    ).toThrow(/AuthCapturePayload/)
  })

  it('throws ValidationError when settle result is missing payer', () => {
    const ctx = makeContext({})
    // @ts-expect-error — exercising the runtime guard
    ctx.result.payer = undefined
    expect(() => reconstructPaymentInfoWire(ctx)).toThrow(ValidationError)
    expect(() => reconstructPaymentInfoWire(ctx)).toThrow(/payer/)
  })

  it('preserves all 6 wire→runtime field renames', () => {
    const struct = reconstructPaymentInfoWire(makeContext({}))

    // operator ← extra.captureAuthorizer
    expect(struct.operator).toBe(BASE_EXTRA.captureAuthorizer)
    // receiver ← requirements.payTo
    expect(struct.receiver).toBe(BASE_REQUIREMENTS.payTo)
    // token ← requirements.asset
    expect(struct.token).toBe(BASE_REQUIREMENTS.asset)
    // authorizationExpiry ← extra.captureDeadline
    expect(struct.authorizationExpiry).toBe(BASE_EXTRA.captureDeadline)
    // refundExpiry ← extra.refundDeadline
    expect(struct.refundExpiry).toBe(BASE_EXTRA.refundDeadline)
    // feeReceiver ← extra.feeRecipient
    expect(struct.feeReceiver).toBe(BASE_EXTRA.feeRecipient)
  })
})
