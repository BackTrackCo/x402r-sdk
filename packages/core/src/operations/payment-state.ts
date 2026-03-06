import type { Address, PublicClient } from 'viem'
import { escrowStateAbi } from '../abis/escrow.js'
import { paymentOperatorAbi } from '../abis/generated.js'
import { computePaymentInfoHash } from '../payment/hashing.js'
import type { PaymentInfo } from '../types/index.js'
import { wrapContractCall } from './error-wrapping.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaymentAmounts {
  hasCollectedPayment: boolean
  capturableAmount: bigint
  refundableAmount: bigint
}

// ---------------------------------------------------------------------------
// Read functions
// ---------------------------------------------------------------------------

/**
 * Reads escrow payment state for a given payment.
 *
 * Multi-step orchestration:
 * 1. Read ESCROW address from the PaymentOperator
 * 2. Compute paymentInfoHash via `computePaymentInfoHash(chainId, escrowAddress, paymentInfo)`
 * 3. Call `paymentState(hash)` on the escrow contract
 */
export async function getPaymentState(
  publicClient: PublicClient,
  operatorAddress: Address,
  chainId: number,
  paymentInfo: PaymentInfo,
): Promise<readonly [boolean, bigint, bigint]> {
  const escrowAddress = await wrapContractCall('getPaymentState.ESCROW', () =>
    publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'ESCROW',
    }),
  )

  const hash = computePaymentInfoHash(chainId, escrowAddress, paymentInfo)

  return wrapContractCall('getPaymentState.paymentState', () =>
    publicClient.readContract({
      address: escrowAddress,
      abi: escrowStateAbi,
      functionName: 'paymentState',
      args: [hash],
    }),
  )
}

export async function getPaymentAmounts(
  publicClient: PublicClient,
  operatorAddress: Address,
  chainId: number,
  paymentInfo: PaymentInfo,
): Promise<PaymentAmounts> {
  const [hasCollectedPayment, capturableAmount, refundableAmount] =
    await getPaymentState(publicClient, operatorAddress, chainId, paymentInfo)
  return { hasCollectedPayment, capturableAmount, refundableAmount }
}
