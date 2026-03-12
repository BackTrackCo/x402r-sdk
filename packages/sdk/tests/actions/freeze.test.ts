import { describe, expect, it, vi } from 'vitest'
import { createFreezeActions } from '../../src/actions/freeze.js'
import { createTestConfig, mockPaymentInfo, TEST_FREEZE } from '../fixtures.js'

vi.mock('@x402r/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@x402r/core')>()
  return {
    ...actual,
    freezePayment: vi.fn().mockResolvedValue('0xfreezehash'),
    unfreezePayment: vi.fn().mockResolvedValue('0xunfreezehash'),
    isFrozen: vi.fn().mockResolvedValue(true),
  }
})

describe('createFreezeActions', () => {
  it('freeze delegates to core with freezeAddress and requires wallet', async () => {
    const { freezePayment } = await import('@x402r/core')
    const config = createTestConfig({ freezeAddress: TEST_FREEZE })
    const actions = createFreezeActions(config, TEST_FREEZE)

    const result = await actions.freeze(mockPaymentInfo)

    expect(result).toBe('0xfreezehash')
    expect(freezePayment).toHaveBeenCalledWith(config.walletClient, {
      freezeAddress: TEST_FREEZE,
      paymentInfo: mockPaymentInfo,
    })
  })

  it('freeze throws without walletClient', async () => {
    const config = createTestConfig({
      freezeAddress: TEST_FREEZE,
      walletClient: undefined,
    })
    const actions = createFreezeActions(config, TEST_FREEZE)

    await expect(() => actions.freeze(mockPaymentInfo)).rejects.toThrow(
      'walletClient is required',
    )
  })

  it('unfreeze delegates to core with freezeAddress', async () => {
    const { unfreezePayment } = await import('@x402r/core')
    const config = createTestConfig({ freezeAddress: TEST_FREEZE })
    const actions = createFreezeActions(config, TEST_FREEZE)

    const result = await actions.unfreeze(mockPaymentInfo)

    expect(result).toBe('0xunfreezehash')
    expect(unfreezePayment).toHaveBeenCalledWith(config.walletClient, {
      freezeAddress: TEST_FREEZE,
      paymentInfo: mockPaymentInfo,
    })
  })

  it('isFrozen works without walletClient (read-only)', async () => {
    const { isFrozen } = await import('@x402r/core')
    const config = createTestConfig({
      freezeAddress: TEST_FREEZE,
      walletClient: undefined,
    })
    const actions = createFreezeActions(config, TEST_FREEZE)

    const result = await actions.isFrozen(mockPaymentInfo)

    expect(result).toBe(true)
    expect(isFrozen).toHaveBeenCalledWith(config.publicClient, {
      freezeAddress: TEST_FREEZE,
      paymentInfo: mockPaymentInfo,
    })
  })
})
