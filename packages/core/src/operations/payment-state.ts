import type { Address, PublicClient } from 'viem'
import { paymentOperatorAbi } from '../abis/generated.js'
import { computePaymentInfoHash } from '../payment/hashing.js'
import type { PaymentInfo } from '../types/index.js'
import { wrapContractCall } from './error-wrapping.js'

// Inline ABI — escrow is from x402 base protocol, not in generated.ts
const escrowStateAbi = [
  {
    type: 'function',
    name: 'paymentState',
    inputs: [{ name: 'paymentInfoHash', type: 'bytes32' }],
    outputs: [
      { name: 'hasCollectedPayment', type: 'bool' },
      { name: 'capturableAmount', type: 'uint120' },
      { name: 'refundableAmount', type: 'uint120' },
    ],
    stateMutability: 'view',
  },
] as const

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
) {
  const escrowAddress = await wrapContractCall('getPaymentState.ESCROW', () =>
    publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'ESCROW',
    }),
  )

  const hash = computePaymentInfoHash(
    chainId,
    escrowAddress as Address,
    paymentInfo,
  )

  return wrapContractCall('getPaymentState.paymentState', () =>
    publicClient.readContract({
      address: escrowAddress as Address,
      abi: escrowStateAbi,
      functionName: 'paymentState',
      args: [hash],
    }),
  )
}
