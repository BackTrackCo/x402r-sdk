import { ValidationError } from '@x402r/core'
import { describe, expect, it } from 'vitest'
import { parseForwardedPayload } from '../src/parse-forwarded-payload.js'

const VALID_BODY = {
  responseBody: '{"temp": 72}',
  transaction: '0xabc',
  paymentPayload: {
    x402Version: 2,
    accepted: { scheme: 'commerce', network: 'eip155:84532' },
    payload: {
      paymentInfo: {
        operator: '0x1111111111111111111111111111111111111111',
        payer: '0x2222222222222222222222222222222222222222',
        receiver: '0x3333333333333333333333333333333333333333',
        token: '0x4444444444444444444444444444444444444444',
        maxAmount: '1000000',
        preApprovalExpiry: 0,
        authorizationExpiry: 1700000000,
        refundExpiry: 1700086400,
        minFeeBps: 100,
        maxFeeBps: 500,
        feeReceiver: '0x5555555555555555555555555555555555555555',
        salt: '999',
      },
    },
  },
}

describe('parseForwardedPayload', () => {
  it('parses a valid forwarded payload', () => {
    const result = parseForwardedPayload(VALID_BODY)

    expect(result.network).toBe('eip155:84532')
    expect(result.transaction).toBe('0xabc')
    expect(result.responseBody).toEqual({ temp: 72 })
    expect(result.paymentInfo.maxAmount).toBe(1000000n)
    expect(result.paymentInfo.salt).toBe(999n)
    expect(result.paymentInfo.operator).toBe(
      '0x1111111111111111111111111111111111111111',
    )
  })

  it('keeps responseBody as string if not valid JSON', () => {
    const body = { ...VALID_BODY, responseBody: 'not json' }
    const result = parseForwardedPayload(body)
    expect(result.responseBody).toBe('not json')
  })

  it('throws on null body', () => {
    expect(() => parseForwardedPayload(null)).toThrow(ValidationError)
  })

  it('throws on missing transaction', () => {
    const { transaction: _, ...body } = VALID_BODY
    expect(() => parseForwardedPayload(body)).toThrow(/transaction/)
  })

  it('throws on missing paymentPayload', () => {
    const { paymentPayload: _, ...body } = VALID_BODY
    expect(() =>
      parseForwardedPayload({ ...body, transaction: '0xabc' }),
    ).toThrow(/paymentPayload/)
  })

  it('throws on missing network in accepted', () => {
    const body = {
      ...VALID_BODY,
      paymentPayload: {
        ...VALID_BODY.paymentPayload,
        accepted: { scheme: 'commerce' },
      },
    }
    expect(() => parseForwardedPayload(body)).toThrow(/network/)
  })

  it('throws on missing paymentInfo', () => {
    const body = {
      ...VALID_BODY,
      paymentPayload: {
        ...VALID_BODY.paymentPayload,
        payload: {},
      },
    }
    expect(() => parseForwardedPayload(body)).toThrow(/paymentInfo/)
  })
})
