import { X402rError } from '@x402r/core'
import { describe, expect, it, vi } from 'vitest'
import { forwardToArbiter } from '../src/forward-to-arbiter.js'

const MOCK_PAYMENT_PAYLOAD = {
  x402Version: 2,
  accepted: { scheme: 'authCapture', network: 'eip155:84532' },
  payload: { paymentInfo: { operator: '0x1', payer: '0x2', salt: '123' } },
}

function makeContext(overrides: {
  success?: boolean
  scheme?: string
  responseBody?: string
}) {
  return {
    result: {
      success: overrides.success ?? true,
      transaction: '0xabc',
      network: 'eip155:84532',
    },
    requirements: {
      scheme: overrides.scheme ?? 'authCapture',
      network: 'eip155:84532',
    },
    paymentPayload: MOCK_PAYMENT_PAYLOAD,
    transportContext: overrides.responseBody
      ? { responseBody: Buffer.from(overrides.responseBody) }
      : undefined,
  }
}

describe('forwardToArbiter', () => {
  it('POSTs to arbiter on successful authCapture settlement', async () => {
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
      expect(parsed.paymentPayload).toEqual(MOCK_PAYMENT_PAYLOAD)
      expect(parsed.scheme).toBeUndefined()
      expect(parsed.network).toBeUndefined()
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
})
