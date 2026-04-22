import { encodePaymentRequiredHeader } from '@x402/core/http'
import type { PaymentRequired, PaymentRequirements } from '@x402/core/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Malformed402Error, MaxAmountExceededError } from '../src/errors.js'
import { pay } from '../src/pay/index.js'

const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const KEY = `0x${'1'.repeat(64)}`
const URL = 'https://merchant.example/paid'

function accept(
  network: string,
  amount = '10000',
  asset = USDC,
): PaymentRequirements {
  return {
    scheme: 'escrow',
    network: network as PaymentRequirements['network'],
    asset,
    amount,
    payTo: '0x0000000000000000000000000000000000000001',
    maxTimeoutSeconds: 60,
    extra: {},
  }
}

function pr(accepts: PaymentRequirements[]): PaymentRequired {
  return {
    x402Version: 2,
    resource: { url: URL },
    accepts,
  }
}

function respond402(requirements: PaymentRequired): Response {
  const header = encodePaymentRequiredHeader(requirements)
  return new Response(null, {
    status: 402,
    headers: { 'PAYMENT-REQUIRED': header },
  })
}

function respond200(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('pay()', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    delete process.env.PRIVATE_KEY
  })

  afterEach(() => {
    fetchSpy?.mockRestore()
  })

  it('short-circuits when the URL returns non-402', async () => {
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(respond200('{"ok":true}'))

    const result = await pay({ url: URL, key: KEY })

    expect(result.status).toBe(200)
    expect(result.body).toBe('{"ok":true}')
    expect(result.signer).toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('throws Malformed402Error when the 402 has no accepts[]', async () => {
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(respond402(pr([])))

    await expect(pay({ url: URL, key: KEY })).rejects.toBeInstanceOf(
      Malformed402Error,
    )
  })

  it('throws Malformed402Error when the 402 has no PAYMENT-REQUIRED header or body', async () => {
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 402 }))

    await expect(pay({ url: URL, key: KEY })).rejects.toBeInstanceOf(
      Malformed402Error,
    )
  })

  it('throws MaxAmountExceededError when the 402 price exceeds --max-amount', async () => {
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(respond402(pr([accept('eip155:84532', '20000')])))

    await expect(
      pay({ url: URL, key: KEY, maxAmount: '10000' }),
    ).rejects.toBeInstanceOf(MaxAmountExceededError)
  })

  it('throws Malformed402Error when accepts[] has multiple entries and no --chain', async () => {
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        respond402(pr([accept('eip155:84532'), accept('eip155:8453')])),
      )

    await expect(pay({ url: URL, key: KEY })).rejects.toThrow(
      /pass --chain <eip155:id>/,
    )
  })

  it('does not hit fetch a second time when the short-circuit path is taken', async () => {
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(respond200('free content'))

    await pay({ url: URL, key: KEY })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
