import type { Address, Hash, Hex, PublicClient, WalletClient } from 'viem'
import { signatureRefundRequestAbi } from '../abis/generated.js'
import { ContractCallError } from '../errors/index.js'
import type { PaymentInfo } from '../types/index.js'
import { wrapContractCall } from './error-wrapping.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const RefundRequestStatus = {
  Pending: 0,
  Approved: 1,
  Denied: 2,
  Refused: 3,
  Cancelled: 4,
} as const

export type RefundRequestStatus =
  (typeof RefundRequestStatus)[keyof typeof RefundRequestStatus]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RefundRequestData {
  paymentInfoHash: Hex
  nonce: bigint
  amount: bigint
  status: number
}

// ---------------------------------------------------------------------------
// Read functions
// ---------------------------------------------------------------------------

export async function hasRefundRequest(
  publicClient: PublicClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<boolean> {
  return publicClient.readContract({
    address: contractAddress,
    abi: signatureRefundRequestAbi,
    functionName: 'hasRefundRequest',
    args: [paymentInfo, nonce],
  }) as Promise<boolean>
}

export async function getRefundRequestStatus(
  publicClient: PublicClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<RefundRequestStatus> {
  return publicClient.readContract({
    address: contractAddress,
    abi: signatureRefundRequestAbi,
    functionName: 'getRefundRequestStatus',
    args: [paymentInfo, nonce],
  }) as Promise<RefundRequestStatus>
}

export async function getRefundRequest(
  publicClient: PublicClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<RefundRequestData> {
  return publicClient.readContract({
    address: contractAddress,
    abi: signatureRefundRequestAbi,
    functionName: 'getRefundRequest',
    args: [paymentInfo, nonce],
  }) as Promise<RefundRequestData>
}

// ---------------------------------------------------------------------------
// Write functions
// ---------------------------------------------------------------------------

export async function requestRefund(
  walletClient: WalletClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
  nonce: bigint,
): Promise<Hash> {
  if (!walletClient.account) {
    throw new ContractCallError('requestRefund', {
      details: 'walletClient must have an account attached',
    })
  }

  return wrapContractCall('requestRefund', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'requestRefund',
      args: [paymentInfo, amount, nonce],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}

export async function approveRefundWithSignature(
  walletClient: WalletClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
  amount: bigint,
  expiry: number,
  signature: Hex,
): Promise<Hash> {
  if (!walletClient.account) {
    throw new ContractCallError('approveRefundWithSignature', {
      details: 'walletClient must have an account attached',
    })
  }

  return wrapContractCall('approveRefundWithSignature', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'approveWithSignature',
      args: [paymentInfo, nonce, amount, expiry, signature],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}

export async function denyRefundRequest(
  walletClient: WalletClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<Hash> {
  if (!walletClient.account) {
    throw new ContractCallError('denyRefundRequest', {
      details: 'walletClient must have an account attached',
    })
  }

  return wrapContractCall('denyRefundRequest', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'deny',
      args: [paymentInfo, nonce],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}

export async function refuseRefundRequest(
  walletClient: WalletClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<Hash> {
  if (!walletClient.account) {
    throw new ContractCallError('refuseRefundRequest', {
      details: 'walletClient must have an account attached',
    })
  }

  return wrapContractCall('refuseRefundRequest', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'refuse',
      args: [paymentInfo, nonce],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}

export async function cancelRefundRequest(
  walletClient: WalletClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<Hash> {
  if (!walletClient.account) {
    throw new ContractCallError('cancelRefundRequest', {
      details: 'walletClient must have an account attached',
    })
  }

  return wrapContractCall('cancelRefundRequest', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'cancelRefundRequest',
      args: [paymentInfo, nonce],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}
