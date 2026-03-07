import type { Address, Hash, Hex, WalletClient } from 'viem'
import { signatureRefundRequestAbi } from '../abis/generated.js'
import type { PaymentInfo } from '../types/index.js'
import { requireAccount, wrapContractCall } from './error-wrapping.js'

export async function requestRefund(
  walletClient: WalletClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
  nonce: bigint,
): Promise<Hash> {
  requireAccount(walletClient, 'requestRefund')

  return wrapContractCall('requestRefund', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'requestRefund',
      args: [paymentInfo, amount, nonce],
      chain: walletClient.chain,
      account: walletClient.account,
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
  requireAccount(walletClient, 'approveRefundWithSignature')

  return wrapContractCall('approveRefundWithSignature', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'approveWithSignature',
      args: [paymentInfo, nonce, amount, expiry, signature],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}

export async function denyRefundRequest(
  walletClient: WalletClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<Hash> {
  requireAccount(walletClient, 'denyRefundRequest')

  return wrapContractCall('denyRefundRequest', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'deny',
      args: [paymentInfo, nonce],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}

export async function refuseRefundRequest(
  walletClient: WalletClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<Hash> {
  requireAccount(walletClient, 'refuseRefundRequest')

  return wrapContractCall('refuseRefundRequest', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'refuse',
      args: [paymentInfo, nonce],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}

export async function cancelRefundRequest(
  walletClient: WalletClient,
  contractAddress: Address,
  paymentInfo: PaymentInfo,
  nonce: bigint,
): Promise<Hash> {
  requireAccount(walletClient, 'cancelRefundRequest')

  return wrapContractCall('cancelRefundRequest', () =>
    walletClient.writeContract({
      address: contractAddress,
      abi: signatureRefundRequestAbi,
      functionName: 'cancelRefundRequest',
      args: [paymentInfo, nonce],
      chain: walletClient.chain,
      account: walletClient.account,
    }),
  )
}
