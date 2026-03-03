import { describe, expect, it } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import {
  approveRefundWithSignature,
  cancelRefundRequest,
  denyRefundRequest,
  refuseRefundRequest,
  requestRefund,
} from '../src/operations/refund.js'
import {
  createMockWalletClient,
  createMockWalletWithoutAccount,
  makePaymentInfo,
} from './fixtures.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_CONTRACT = '0x1111111111111111111111111111111111111111' as const

// ---------------------------------------------------------------------------
// Write functions — table-driven
// ---------------------------------------------------------------------------

const paymentInfo = makePaymentInfo()

const writeCases = [
  {
    name: 'requestRefund',
    fn: requestRefund as (...args: any[]) => Promise<any>,
    functionName: 'requestRefund',
    extraArgs: [100n, 0n],
    expectedArgs: [paymentInfo, 100n, 0n],
  },
  {
    name: 'approveRefundWithSignature',
    fn: approveRefundWithSignature as (...args: any[]) => Promise<any>,
    functionName: 'approveWithSignature',
    extraArgs: [1n, 200n, 2000000000, '0xdeadbeef'],
    expectedArgs: [paymentInfo, 1n, 200n, 2000000000, '0xdeadbeef'],
  },
  {
    name: 'denyRefundRequest',
    fn: denyRefundRequest as (...args: any[]) => Promise<any>,
    functionName: 'deny',
    extraArgs: [0n],
    expectedArgs: [paymentInfo, 0n],
  },
  {
    name: 'refuseRefundRequest',
    fn: refuseRefundRequest as (...args: any[]) => Promise<any>,
    functionName: 'refuse',
    extraArgs: [0n],
    expectedArgs: [paymentInfo, 0n],
  },
  {
    name: 'cancelRefundRequest',
    fn: cancelRefundRequest as (...args: any[]) => Promise<any>,
    functionName: 'cancelRefundRequest',
    extraArgs: [0n],
    expectedArgs: [paymentInfo, 0n],
  },
]

describe('refund write functions', () => {
  it.each(writeCases)('$name throws without account', async ({
    fn,
    extraArgs,
  }) => {
    await expect(
      fn(
        createMockWalletWithoutAccount(),
        MOCK_CONTRACT,
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
    await fn(wallet, MOCK_CONTRACT, paymentInfo, ...extraArgs)
    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: MOCK_CONTRACT,
        functionName,
        args: expectedArgs,
      }),
    )
  })
})
