import type { PaymentInfo } from '@x402r/core'
import type { PayerClient } from '@x402r/sdk'

// Request a refund for a payment in escrow. The refund module is only present
// when the operator was deployed with a RefundRequest hook, so guard on it
// before calling. `request` takes the PaymentInfo and the amount to refund and
// returns the submitted transaction hash.
export async function requestRefund(
  payer: PayerClient,
  paymentInfo: PaymentInfo,
  amount: bigint,
): Promise<`0x${string}`> {
  if (!payer.refund) {
    throw new Error(
      'Refund module not available — check operator configuration',
    )
  }

  const txHash = await payer.refund.request(paymentInfo, amount)
  return txHash
}
