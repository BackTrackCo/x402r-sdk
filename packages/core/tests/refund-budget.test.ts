import { describe, expect, it } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import { getRefundBudget } from '../src/operations/refund-budget-reads.js'
import { approveRefundBudget } from '../src/operations/refund-budget-writes.js'
import {
  createMockPublicClient,
  createMockWalletWithoutAccount,
  TEST_ADDRESSES,
} from './fixtures.js'

const MOCK_OPERATOR = '0x1111111111111111111111111111111111111111' as const

describe('refund budget read functions', () => {
  it('getRefundBudget calls readContract with correct args', async () => {
    const client = createMockPublicClient({ allowance: 1_000_000n })
    const result = await getRefundBudget(
      client,
      TEST_ADDRESSES.token as `0x${string}`,
      TEST_ADDRESSES.payer as `0x${string}`,
      MOCK_OPERATOR,
    )
    expect(result).toBe(1_000_000n)
  })
})

describe('approveRefundBudget', () => {
  it('throws without account', async () => {
    await expect(
      approveRefundBudget(
        createMockWalletWithoutAccount(),
        TEST_ADDRESSES.token as `0x${string}`,
        MOCK_OPERATOR,
        1_000_000n,
      ),
    ).rejects.toThrow(ContractCallError)
  })
})
