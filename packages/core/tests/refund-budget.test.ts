import { describe, expect, it } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import {
  approveRefundBudget,
  getRefundBudget,
  refundInEscrow,
  refundPostEscrow,
} from '../src/operations/refund-budget.js'
import {
  createMockPublicClient,
  createMockWalletClient,
  createMockWalletWithoutAccount,
  makePaymentInfo,
  TEST_ADDRESSES,
} from './fixtures.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_OPERATOR = '0x1111111111111111111111111111111111111111' as const
const MOCK_COLLECTOR = '0x8888888888888888888888888888888888888888' as const

// ---------------------------------------------------------------------------
// getRefundBudget (ERC-20 allowance read)
// ---------------------------------------------------------------------------

describe('getRefundBudget', () => {
  it('returns allowance amount', async () => {
    const client = createMockPublicClient({ allowance: 5_000_000n })
    const result = await getRefundBudget(
      client,
      TEST_ADDRESSES.token as `0x${string}`,
      TEST_ADDRESSES.receiver as `0x${string}`,
      MOCK_OPERATOR,
    )
    expect(result).toBe(5_000_000n)
  })
})

// ---------------------------------------------------------------------------
// approveRefundBudget (ERC-20 approve write)
// ---------------------------------------------------------------------------

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

  it('forwards to writeContract', async () => {
    const wallet = createMockWalletClient()
    await approveRefundBudget(
      wallet,
      TEST_ADDRESSES.token as `0x${string}`,
      MOCK_OPERATOR,
      1_000_000n,
    )
    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: TEST_ADDRESSES.token,
        functionName: 'approve',
        args: [MOCK_OPERATOR, 1_000_000n],
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// Write functions — table-driven
// ---------------------------------------------------------------------------

const paymentInfo = makePaymentInfo()

const writeCases = [
  {
    name: 'refundInEscrow',
    fn: refundInEscrow as (...args: any[]) => Promise<any>,
    functionName: 'refundInEscrow',
    extraArgs: [500000n],
    expectedArgs: [paymentInfo, 500000n],
  },
  {
    name: 'refundPostEscrow',
    fn: refundPostEscrow as (...args: any[]) => Promise<any>,
    functionName: 'refundPostEscrow',
    extraArgs: [1000000n, MOCK_COLLECTOR, '0xdeadbeef'],
    expectedArgs: [paymentInfo, 1000000n, MOCK_COLLECTOR, '0xdeadbeef'],
  },
]

describe('refund-budget write functions', () => {
  it.each(writeCases)('$name throws without account', async ({
    fn,
    extraArgs,
  }) => {
    await expect(
      fn(
        createMockWalletWithoutAccount(),
        MOCK_OPERATOR,
        paymentInfo,
        ...extraArgs,
      ),
    ).rejects.toThrow(ContractCallError)
  })

  it.each(writeCases)('$name forwards to writeContract', async ({
    fn,
    functionName,
    extraArgs,
    expectedArgs,
  }) => {
    const wallet = createMockWalletClient()
    await fn(wallet, MOCK_OPERATOR, paymentInfo, ...extraArgs)
    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_OPERATOR,
        functionName,
        args: expectedArgs,
      }),
    )
  })
})
