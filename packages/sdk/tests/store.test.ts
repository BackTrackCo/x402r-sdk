import type { PaymentInfo } from '@x402r/core'
import { describe, expect, it } from 'vitest'
import { createMemoryStore } from '../src/store/memory.js'
import { mockPaymentInfo } from './fixtures.js'

const HASH_A =
  '0xaaaa000000000000000000000000000000000000000000000000000000000001' as const
const HASH_B =
  '0xbbbb000000000000000000000000000000000000000000000000000000000002' as const
const HASH_C =
  '0xcccc000000000000000000000000000000000000000000000000000000000003' as const

const infoA: PaymentInfo = { ...mockPaymentInfo, salt: 1n }
const infoB: PaymentInfo = { ...mockPaymentInfo, salt: 2n }
const infoC: PaymentInfo = {
  ...mockPaymentInfo,
  payer: '0x9999999999999999999999999999999999999999',
  receiver: '0x8888888888888888888888888888888888888888',
  salt: 3n,
}

describe('createMemoryStore', () => {
  it('save + getByHash — retrieves exact match', async () => {
    const store = createMemoryStore()
    await store.save(84532, HASH_A, infoA)

    const result = await store.getByHash(84532, HASH_A)

    expect(result).toEqual(infoA)
  })

  it('save + getByPayer — filters by payer correctly', async () => {
    const store = createMemoryStore()
    await store.save(84532, HASH_A, infoA)
    await store.save(84532, HASH_B, infoB)
    await store.save(84532, HASH_C, infoC) // different payer

    const results = await store.getByPayer(84532, mockPaymentInfo.payer)

    expect(results).toHaveLength(2)
    expect(results).toContainEqual(infoA)
    expect(results).toContainEqual(infoB)
  })

  it('save + getByReceiver — filters by receiver correctly', async () => {
    const store = createMemoryStore()
    await store.save(84532, HASH_A, infoA)
    await store.save(84532, HASH_C, infoC) // different receiver

    const results = await store.getByReceiver(84532, mockPaymentInfo.receiver)

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual(infoA)
  })

  it('getByPayer is case-insensitive', async () => {
    const store = createMemoryStore()
    const checksummedPayer = '0x2234567890ABCDEF1234567890abcdef12345678'
    const info: PaymentInfo = { ...mockPaymentInfo, payer: checksummedPayer }
    await store.save(84532, HASH_A, info)

    const results = await store.getByPayer(
      84532,
      checksummedPayer.toLowerCase() as `0x${string}`,
    )

    expect(results).toHaveLength(1)
  })

  it('getByHash returns null for unknown hash', async () => {
    const store = createMemoryStore()

    const result = await store.getByHash(84532, HASH_A)

    expect(result).toBeNull()
  })

  it('remove — getByHash returns null after removal', async () => {
    const store = createMemoryStore()
    await store.save(84532, HASH_A, infoA)
    await store.remove(84532, HASH_A)

    const result = await store.getByHash(84532, HASH_A)

    expect(result).toBeNull()
  })

  it('chain isolation — different chainId returns empty', async () => {
    const store = createMemoryStore()
    await store.save(84532, HASH_A, infoA)

    const results = await store.getByPayer(1, mockPaymentInfo.payer)

    expect(results).toHaveLength(0)
  })

  it('multiple chains — same hash returns correct info per chain', async () => {
    const store = createMemoryStore()
    const infoChain1: PaymentInfo = { ...mockPaymentInfo, salt: 100n }
    const infoChain2: PaymentInfo = { ...mockPaymentInfo, salt: 200n }
    await store.save(1, HASH_A, infoChain1)
    await store.save(84532, HASH_A, infoChain2)

    const result1 = await store.getByHash(1, HASH_A)
    const result2 = await store.getByHash(84532, HASH_A)

    expect(result1).toEqual(infoChain1)
    expect(result2).toEqual(infoChain2)
  })
})
