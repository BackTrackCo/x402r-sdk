import type { Address, PublicClient } from 'viem'
import { paymentIndexRecorderHookAbi } from '../../abis/generated.js'
import type { PaymentInfo } from '../../types/index.js'
import { wrapContractCall } from '../_internal/error-wrapping.js'

export interface GetPayerPaymentsFromHookParameters {
  hookAddress: Address
  payer: Address
  offset: bigint
  count: bigint
  /**
   * If set, filters returned `payments` to those from this operator. The
   * canonical `PaymentIndexRecorderHook` is a chain singleton aggregating
   * across every operator routing through HookCombinator; without filtering
   * callers receive mingled records.
   *
   * Caveat: the returned `total` is the on-chain pre-filter count and is
   * NOT operator-scoped. For paginated reads with this option set, advance
   * `offset` by the requested `count` (not by `payments.length`) and stop
   * when `offset >= total`. Per-operator-accurate totals would require
   * paginating fully and counting filtered results client-side.
   */
  operatorAddress?: Address
}

export interface GetPayerPaymentsFromHookReturnType {
  payments: PaymentInfo[]
  total: bigint
}

export async function getPayerPaymentsFromHook(
  publicClient: PublicClient,
  parameters: GetPayerPaymentsFromHookParameters,
): Promise<GetPayerPaymentsFromHookReturnType> {
  const { hookAddress, payer, offset, count, operatorAddress } = parameters

  const [payments, total] = await wrapContractCall(
    'getPayerPaymentsFromHook',
    () =>
      publicClient.readContract({
        address: hookAddress,
        abi: paymentIndexRecorderHookAbi,
        functionName: 'getPayerPayments',
        args: [payer, offset, count],
      }),
  )

  const all = payments as unknown as PaymentInfo[]
  const filtered = operatorAddress
    ? all.filter((p) => p.operator === operatorAddress)
    : all
  return { payments: filtered, total }
}
