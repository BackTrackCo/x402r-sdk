import { describe, expect, it } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import { isFrozen } from '../src/operations/freeze-reads.js'
import { freezePayment } from '../src/operations/freeze-writes.js'
import {
  createMockPublicClient,
  createMockWalletWithoutAccount,
  makePaymentInfo,
} from './fixtures.js'

const MOCK_FREEZE = '0x1111111111111111111111111111111111111111' as const

describe('freeze read functions', () => {
  it('isFrozen calls readContract with correct args', async () => {
    const client = createMockPublicClient({ isFrozen: false })
    const result = await isFrozen(client, MOCK_FREEZE, makePaymentInfo())
    expect(result).toBe(false)
  })
})

describe('freeze write functions', () => {
  it('freezePayment throws without account', async () => {
    await expect(
      freezePayment(
        createMockWalletWithoutAccount(),
        MOCK_FREEZE,
        makePaymentInfo(),
      ),
    ).rejects.toThrow(ContractCallError)
  })
})
