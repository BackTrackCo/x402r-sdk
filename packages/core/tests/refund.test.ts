import { describe, expect, it } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import { RefundRequestStatus, requestRefund } from '../src/operations/refund.js'
import { createMockWalletWithoutAccount, makePaymentInfo } from './fixtures.js'

const MOCK_CONTRACT = '0x1111111111111111111111111111111111111111' as const

describe('RefundRequestStatus', () => {
  it('matches Solidity enum values', () => {
    expect(RefundRequestStatus.Pending).toBe(0)
    expect(RefundRequestStatus.Approved).toBe(1)
    expect(RefundRequestStatus.Denied).toBe(2)
    expect(RefundRequestStatus.Refused).toBe(3)
    expect(RefundRequestStatus.Cancelled).toBe(4)
  })
})

describe('refund write functions', () => {
  it('requestRefund throws without account', async () => {
    await expect(
      requestRefund(
        createMockWalletWithoutAccount(),
        MOCK_CONTRACT,
        makePaymentInfo(),
        100n,
        0n,
      ),
    ).rejects.toThrow(ContractCallError)
  })
})
