import { describe, expect, it, vi } from 'vitest'
import { forwardToArbiter } from '../src/forward-to-arbiter.js'

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
      scheme: overrides.scheme ?? 'escrow',
      network: 'eip155:84532',
    },
    transportContext: overrides.responseBody
      ? { responseBody: Buffer.from(overrides.responseBody) }
      : undefined,
  }
}

describe('forwardToArbiter', () => {
  it('POSTs to arbiter on successful escrow settlement', async () => {
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
      expect(parsed.scheme).toBe('escrow')
      expect(parsed.transaction).toBe('0xabc')
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

  it('skips on non-escrow scheme', async () => {
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
        '[forwardToArbiter] failed:',
        expect.any(Error),
      )
    } finally {
      globalThis.fetch = original
      warnSpy.mockRestore()
    }
  })

  it('calls onError option on fetch failure', async () => {
    const original = globalThis.fetch
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network failure')
    }) as any
    const onError = vi.fn()

    try {
      const hook = forwardToArbiter('http://localhost:3001', { onError })
      await hook(makeContext({ responseBody: '{"temp": 72}' }))
      await new Promise((r) => setTimeout(r, 50))

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
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
