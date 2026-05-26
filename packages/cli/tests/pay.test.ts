import { encodePaymentRequiredHeader } from '@x402/core/http'
import type { PaymentRequired, PaymentRequirements } from '@x402/core/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Malformed402Error,
  MaxAmountExceededError,
  SettlementError,
} from '../src/errors.js'
import type { SignerMeta } from '../src/pay/index.js'
import { applyPaymentResult, pay } from '../src/pay/index.js'

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

    expect(result.kind).toBe('no_payment_required')
    expect(result.status).toBe(200)
    expect(result.body).toBe('{"ok":true}')
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

  it('rejects when --asset-transfer-method does not match any accept', async () => {
    const eip3009Only: PaymentRequirements = {
      ...accept('eip155:84532'),
      extra: { assetTransferMethod: 'eip3009' },
    }
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(respond402(pr([eip3009Only])))

    await expect(
      pay({ url: URL, key: KEY, assetTransferMethod: 'permit2' }),
    ).rejects.toThrow(
      /no accepts\[\] entry matches --asset-transfer-method=permit2/,
    )
  })

  it('rejects invalid --asset-transfer-method values', async () => {
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(respond402(pr([accept('eip155:84532')])))

    await expect(
      pay({ url: URL, key: KEY, assetTransferMethod: 'gibberish' }),
    ).rejects.toThrow(/--asset-transfer-method must be 'eip3009' or 'permit2'/)
  })
})

describe('applyPaymentResult()', () => {
  const SIGNER: SignerMeta = {
    kind: 'key',
    address: '0xabCDef0123456789abcdef0123456789ABcdEF01',
  }
  const STARTED = Date.now() - 100

  it('maps success → kind:success with tx from settleResponse', () => {
    const result = applyPaymentResult(
      {
        kind: 'success',
        response: new Response(null),
        body: { ok: true },
        settleResponse: {
          success: true,
          transaction: '0xdeadbeef',
          network: 'eip155:84532',
        } as never,
      },
      200,
      STARTED,
      SIGNER,
    )

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') throw new Error('unreachable')
    expect(result.tx).toBe('0xdeadbeef')
    expect(result.status).toBe(200)
    expect(result.body).toBe('{"ok":true}')
    expect(result.signer).toEqual(SIGNER)
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0)
  })

  it('maps passthrough → kind:passthrough with no tx field', () => {
    const result = applyPaymentResult(
      {
        kind: 'passthrough',
        response: new Response(null),
        body: 'raw text body',
      },
      200,
      STARTED,
      SIGNER,
    )

    expect(result.kind).toBe('passthrough')
    if (result.kind !== 'passthrough') throw new Error('unreachable')
    expect(result.body).toBe('raw text body')
    expect(result.status).toBe(200)
    expect(result.signer).toEqual(SIGNER)
    expect('tx' in result).toBe(false)
  })

  it('maps settle_failed → SettlementError with errorReason in message', () => {
    expect(() =>
      applyPaymentResult(
        {
          kind: 'settle_failed',
          response: new Response(null),
          body: null,
          settleResponse: {
            success: false,
            errorReason: 'insufficient_funds',
            network: 'eip155:84532',
          } as never,
        },
        402,
        STARTED,
        SIGNER,
      ),
    ).toThrowError(new SettlementError('settlement failed: insufficient_funds'))
  })

  it('maps settle_failed without errorReason → "unknown"', () => {
    expect(() =>
      applyPaymentResult(
        {
          kind: 'settle_failed',
          response: new Response(null),
          body: null,
          settleResponse: {
            success: false,
            network: 'eip155:84532',
          } as never,
        },
        402,
        STARTED,
        SIGNER,
      ),
    ).toThrowError(new SettlementError('settlement failed: unknown'))
  })

  it('maps payment_required → SettlementError re-issued message', () => {
    expect(() =>
      applyPaymentResult(
        {
          kind: 'payment_required',
          response: new Response(null),
          paymentRequired: {} as never,
        },
        402,
        STARTED,
        SIGNER,
      ),
    ).toThrowError(new SettlementError('merchant re-issued 402 after payment'))
  })

  it('maps error → SettlementError with truncated body', () => {
    const longBody = 'x'.repeat(500)
    expect(() =>
      applyPaymentResult(
        {
          kind: 'error',
          response: new Response(null),
          status: 503,
          body: longBody,
        },
        503,
        STARTED,
        SIGNER,
      ),
    ).toThrow(/merchant returned 503 after payment: x{200}…/)
  })
})
