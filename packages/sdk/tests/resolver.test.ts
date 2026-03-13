import { describe, expect, it, vi } from 'vitest'
import { createPaymentInfoResolver } from '../src/resolver/createResolver.js'
import type { PaymentInfoProvider } from '../src/resolver/types.js'
import { mockPaymentInfo } from './fixtures.js'

function createMockProvider(
  name: string,
  overrides: Partial<PaymentInfoProvider> = {},
): PaymentInfoProvider {
  return {
    name,
    getByPayer: vi.fn().mockResolvedValue([]),
    getByReceiver: vi.fn().mockResolvedValue([]),
    getByHash: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

describe('createPaymentInfoResolver', () => {
  it('single provider returns its results', async () => {
    const provider = createMockProvider('only', {
      getByPayer: vi.fn().mockResolvedValue([mockPaymentInfo]),
    })
    const resolver = createPaymentInfoResolver(84532, [provider])

    const results = await resolver.getByPayer(mockPaymentInfo.payer)

    expect(results).toEqual([mockPaymentInfo])
    expect(provider.getByPayer).toHaveBeenCalledWith(
      84532,
      mockPaymentInfo.payer,
    )
  })

  it('falls back to second provider when first returns empty', async () => {
    const first = createMockProvider('first')
    const second = createMockProvider('second', {
      getByPayer: vi.fn().mockResolvedValue([mockPaymentInfo]),
    })
    const resolver = createPaymentInfoResolver(84532, [first, second])

    const results = await resolver.getByPayer(mockPaymentInfo.payer)

    expect(results).toEqual([mockPaymentInfo])
    expect(first.getByPayer).toHaveBeenCalled()
    expect(second.getByPayer).toHaveBeenCalled()
  })

  it('falls back silently when first provider throws', async () => {
    const first = createMockProvider('throwing', {
      getByReceiver: vi.fn().mockRejectedValue(new Error('boom')),
    })
    const second = createMockProvider('fallback', {
      getByReceiver: vi.fn().mockResolvedValue([mockPaymentInfo]),
    })
    const resolver = createPaymentInfoResolver(84532, [first, second])

    const results = await resolver.getByReceiver(mockPaymentInfo.receiver)

    expect(results).toEqual([mockPaymentInfo])
  })

  it('returns empty array / null when all providers have nothing', async () => {
    const a = createMockProvider('a')
    const b = createMockProvider('b')
    const resolver = createPaymentInfoResolver(84532, [a, b])

    expect(await resolver.getByPayer(mockPaymentInfo.payer)).toEqual([])
    expect(await resolver.getByReceiver(mockPaymentInfo.receiver)).toEqual([])
    expect(await resolver.getByHash('0xdeadbeef')).toBeNull()
  })

  it('first provider wins — second provider not called when first has results', async () => {
    const first = createMockProvider('winner', {
      getByPayer: vi.fn().mockResolvedValue([mockPaymentInfo]),
    })
    const second = createMockProvider('loser', {
      getByPayer: vi
        .fn()
        .mockResolvedValue([{ ...mockPaymentInfo, salt: 999n }]),
    })
    const resolver = createPaymentInfoResolver(84532, [first, second])

    const results = await resolver.getByPayer(mockPaymentInfo.payer)

    expect(results).toEqual([mockPaymentInfo])
    expect(second.getByPayer).not.toHaveBeenCalled()
  })
})
