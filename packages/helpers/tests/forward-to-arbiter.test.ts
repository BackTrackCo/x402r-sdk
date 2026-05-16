import { X402rError } from '@x402r/core'
import { describe, expect, it, vi } from 'vitest'
import { forwardToArbiter } from '../src/forward-to-arbiter.js'

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

const MOCK_PAYMENT_PAYLOAD = {
  x402Version: 2,
  accepted: { scheme: 'authCapture', network: 'eip155:84532' },
  payload: EIP3009_PAYLOAD,
}

function makeContext(overrides: {
  success?: boolean
  scheme?: string
  responseBody?: string
  payload?: unknown
  extra?: unknown
}) {
  return {
    result: {
      success: overrides.success ?? true,
      transaction: '0xabc',
      network: 'eip155:84532',
      payer: TEST_ADDRESSES.payer,
    },
    requirements: {
      scheme: overrides.scheme ?? 'authCapture',
      network: 'eip155:84532',
      payTo: TEST_ADDRESSES.payTo,
      asset: TEST_ADDRESSES.asset,
      amount: '1000000',
      extra: overrides.extra === undefined ? BASE_EXTRA : overrides.extra,
    },
    paymentPayload: {
      ...MOCK_PAYMENT_PAYLOAD,
      payload: overrides.payload ?? EIP3009_PAYLOAD,
    },
    transportContext: overrides.responseBody
      ? { responseBody: Buffer.from(overrides.responseBody) }
      : undefined,
  }
}

describe('forwardToArbiter', () => {
  it('POSTs reconstructed paymentInfoWire on successful authCapture settlement', async () => {
    let capturedUrl = ''
    let capturedBody = ''
    const original = globalThis.fetch
    globalThis.fetch = vi.fn(async (url: any, opts: any) => {
      capturedUrl = url
      capturedBody = opts.body
      return new Response('ok')
    }) as any

    try {
      const hook = forwardToArbiter('http://localhost:3001')
      await hook(makeContext({ responseBody: '{"temp": 72}' }))
      await new Promise((r) => setTimeout(r, 50))

      expect(capturedUrl).toBe('http://localhost:3001/verify')
      const parsed = JSON.parse(capturedBody)
      expect(parsed.responseBody).toBe('{"temp": 72}')
      expect(parsed.transaction).toBe('0xabc')

      // body now carries the reconstructed PaymentInfoStruct under `paymentInfoWire`
      // (was `paymentPayload` in the old commerce-era shape)
      expect(parsed.paymentPayload).toBeUndefined()
      expect(parsed.paymentInfo).toBeUndefined()
      expect(parsed.paymentInfoWire).toBeDefined()
      expect(parsed.paymentInfoWire.operator).toBe(
        TEST_ADDRESSES.captureAuthorizer,
      )
      expect(parsed.paymentInfoWire.receiver).toBe(TEST_ADDRESSES.payTo)
      expect(parsed.paymentInfoWire.token).toBe(TEST_ADDRESSES.asset)
      expect(parsed.paymentInfoWire.payer).toBe(TEST_ADDRESSES.payer)
      expect(parsed.paymentInfoWire.maxAmount).toBe('1000000')
      expect(parsed.paymentInfoWire.salt).toBe('0x3039')
      expect(parsed.paymentInfoWire.preApprovalExpiry).toBe(1699999000)
      expect(parsed.paymentInfoWire.feeReceiver).toBe(
        TEST_ADDRESSES.feeRecipient,
      )
    } finally {
      globalThis.fetch = original
    }
  })

  it('skips on failed settlement', async () => {
    const original = globalThis.fetch
    const spy = vi.fn()
    globalThis.fetch = spy as any

    try {
      const hook = forwardToArbiter('http://localhost:3001')
      await hook(makeContext({ success: false }))
      await new Promise((r) => setTimeout(r, 50))

      expect(spy).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = original
    }
  })

  it('skips on non-authCapture scheme', async () => {
    const original = globalThis.fetch
    const spy = vi.fn()
    globalThis.fetch = spy as any

    try {
      const hook = forwardToArbiter('http://localhost:3001')
      await hook(
        makeContext({ scheme: 'exact', responseBody: '{"data": true}' }),
      )
      await new Promise((r) => setTimeout(r, 50))

      expect(spy).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = original
    }
  })

  it('skips when no response body', async () => {
    const original = globalThis.fetch
    const spy = vi.fn()
    globalThis.fetch = spy as any

    try {
      const hook = forwardToArbiter('http://localhost:3001')
      await hook(makeContext({}))
      await new Promise((r) => setTimeout(r, 50))

      expect(spy).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = original
    }
  })

  it('warns on fetch errors by default', async () => {
    const original = globalThis.fetch
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network failure')
    }) as any
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const hook = forwardToArbiter('http://localhost:3001')
      await hook(makeContext({ responseBody: '{"temp": 72}' }))
      await new Promise((r) => setTimeout(r, 50))

      expect(warnSpy).toHaveBeenCalledWith(
        '[forwardToArbiter]',
        expect.any(X402rError),
      )
      const err = warnSpy.mock.calls[0][1] as X402rError
      expect(err.shortMessage).toContain('http://localhost:3001')
      expect(err.cause).toBeInstanceOf(Error)
      expect((err.cause as Error).message).toBe('network failure')
      expect(err.details).toContain('/verify')
    } finally {
      globalThis.fetch = original
      warnSpy.mockRestore()
    }
  })

  it('calls onError with arbiter context on fetch failure', async () => {
    const original = globalThis.fetch
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network failure')
    }) as any
    const onError = vi.fn()

    try {
      const hook = forwardToArbiter('http://localhost:3001', { onError })
      await hook(makeContext({ responseBody: '{"temp": 72}' }))
      await new Promise((r) => setTimeout(r, 50))

      expect(onError).toHaveBeenCalledWith(expect.any(X402rError))
      const err = onError.mock.calls[0][0] as X402rError
      expect(err.shortMessage).toContain('http://localhost:3001')
      expect(err.cause).toBeInstanceOf(Error)
      expect((err.cause as Error).message).toBe('network failure')
      expect(err.details).toContain('/verify')
    } finally {
      globalThis.fetch = original
    }
  })

  it('handles trailing slash in arbiter URL', async () => {
    let capturedUrl = ''
    const original = globalThis.fetch
    globalThis.fetch = vi.fn(async (url: any) => {
      capturedUrl = url
      return new Response('ok')
    }) as any

    try {
      const hook = forwardToArbiter('http://localhost:3001/')
      await hook(makeContext({ responseBody: '{"temp": 72}' }))
      await new Promise((r) => setTimeout(r, 50))

      expect(capturedUrl).toBe('http://localhost:3001/verify')
    } finally {
      globalThis.fetch = original
    }
  })

  it('skips POST and calls onError when reconstructPaymentInfoWire throws', async () => {
    const original = globalThis.fetch
    const fetchSpy = vi.fn(async () => new Response('ok'))
    globalThis.fetch = fetchSpy as any
    const onError = vi.fn()

    try {
      const hook = forwardToArbiter('http://localhost:3001', { onError })
      // missing extra → reconstruction throws ValidationError → fetch skipped
      await hook(
        makeContext({ responseBody: '{"temp": 72}', extra: { foo: 'bar' } }),
      )
      await new Promise((r) => setTimeout(r, 50))

      expect(fetchSpy).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalledWith(expect.any(X402rError))
      const err = onError.mock.calls[0][0] as X402rError
      expect(err.details).toContain('reconstructPaymentInfoWire failed')
    } finally {
      globalThis.fetch = original
    }
  })
})
