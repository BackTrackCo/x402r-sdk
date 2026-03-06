import { describe, expect, it } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import { approveRefundBudget } from '../src/operations/refund-budget.js'
import { createMockWalletWithoutAccount, TEST_ADDRESSES } from './fixtures.js'

const MOCK_OPERATOR = '0x1111111111111111111111111111111111111111' as const

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
