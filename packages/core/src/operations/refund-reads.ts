import type { Address, Hex, PublicClient } from 'viem'
import { signatureRefundRequestAbi } from '../abis/generated.js'
import type { PaymentInfo } from '../types/index.js'
import { wrapContractCall } from './error-wrapping.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const RefundRequestStatus = {
  Pending: 0,
  Approved: 1,
  Denied: 2,
  Cancelled: 3,
  Refused: 4,
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
  status: RefundRequestStatus
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
  return wrapContractCall('hasRefundRequest', () =>
    publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'hasRefundRequest',
      args: [paymentInfo, nonce],
    }),
  )
}

export async function getRefundRequestStatus(
  publicClient: PublicClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<RefundRequestStatus> {
  return wrapContractCall('getRefundRequestStatus', () =>
    publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'getRefundRequestStatus',
      args: [paymentInfo, nonce],
    }),
  ) as Promise<RefundRequestStatus>
}

export async function getRefundRequest(
  publicClient: PublicClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<RefundRequestData> {
  return wrapContractCall('getRefundRequest', async () => {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'getRefundRequest',
      args: [paymentInfo, nonce],
    })
    return {
      paymentInfoHash: result.paymentInfoHash,
      nonce: result.nonce,
      amount: result.amount,
      status: result.status as RefundRequestStatus,
    }
  })
}

// ---------------------------------------------------------------------------
// Paginated / lookup reads
// ---------------------------------------------------------------------------

export async function getPayerRefundRequests(
  publicClient: PublicClient,
  contractAddress: Address,
  payer: Address,
  offset: bigint,
  count: bigint,
): Promise<{ keys: readonly Hex[]; total: bigint }> {
  return wrapContractCall('getPayerRefundRequests', async () => {
    const [keys, total] = await publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'getPayerRefundRequests',
      args: [payer, offset, count],
    })
    return { keys: keys as readonly Hex[], total }
  })
}

export async function getReceiverRefundRequests(
  publicClient: PublicClient,
  contractAddress: Address,
  receiver: Address,
  offset: bigint,
  count: bigint,
): Promise<{ keys: readonly Hex[]; total: bigint }> {
  return wrapContractCall('getReceiverRefundRequests', async () => {
    const [keys, total] = await publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'getReceiverRefundRequests',
      args: [receiver, offset, count],
    })
    return { keys: keys as readonly Hex[], total }
  })
}

export async function getOperatorRefundRequests(
  publicClient: PublicClient,
  contractAddress: Address,
  operator: Address,
  offset: bigint,
  count: bigint,
): Promise<{ keys: readonly Hex[]; total: bigint }> {
  return wrapContractCall('getOperatorRefundRequests', async () => {
    const [keys, total] = await publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'getOperatorRefundRequests',
      args: [operator, offset, count],
    })
    return { keys: keys as readonly Hex[], total }
  })
}

export async function getRefundRequestByKey(
  publicClient: PublicClient,
  contractAddress: Address,
  compositeKey: Hex,
): Promise<RefundRequestData> {
  return wrapContractCall('getRefundRequestByKey', async () => {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'getRefundRequestByKey',
      args: [compositeKey],
    })
    return {
      paymentInfoHash: result.paymentInfoHash,
      nonce: result.nonce,
      amount: result.amount,
      status: result.status as RefundRequestStatus,
    }
  })
}

/** Reads stored payment info by hash. ABI function name: `getPaymentInfo`. */
export async function getStoredPaymentInfo(
  publicClient: PublicClient,
  contractAddress: Address,
  paymentInfoHash: Hex,
): Promise<PaymentInfo> {
  return wrapContractCall('getStoredPaymentInfo', () =>
    publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'getPaymentInfo',
      args: [paymentInfoHash],
    }),
  )
}

export async function getCancelCount(
  publicClient: PublicClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<bigint> {
  return wrapContractCall('getCancelCount', () =>
    publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'getCancelCount',
      args: [paymentInfo, nonce],
    }),
  )
}

export async function getCancelledAmount(
  publicClient: PublicClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
  cancelIndex: bigint,
): Promise<bigint> {
  return wrapContractCall('getCancelledAmount', () =>
    publicClient.readContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'getCancelledAmount',
      args: [paymentInfo, nonce, cancelIndex],
    }),
  )
}
