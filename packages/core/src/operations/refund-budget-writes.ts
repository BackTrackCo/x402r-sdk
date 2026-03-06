import type { Address, Hash, Hex, WalletClient } from 'viem'
import { erc20Abi } from 'viem'
import { paymentOperatorAbi } from '../abis/generated.js'
import type { PaymentInfo } from '../types/index.js'
import { requireAccount, wrapContractCall } from './error-wrapping.js'

export async function approveRefundBudget(
  walletClient: WalletClient,
  token: Address,
  operatorAddress: Address,
  amount: bigint,
): Promise<Hash> {
  requireAccount(walletClient, 'approveRefundBudget')

  return wrapContractCall('approveRefundBudget', () =>
    walletClient.writeContract({
      address: token,
      abi: erc20Abi,
      functionName: 'approve',
      args: [operatorAddress, amount],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}

export async function refundInEscrow(
  walletClient: WalletClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
): Promise<Hash> {
  requireAccount(walletClient, 'refundInEscrow')

  return wrapContractCall('refundInEscrow', () =>
    walletClient.writeContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'refundInEscrow',
      args: [paymentInfo, amount],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}

export async function refundPostEscrow(
  walletClient: WalletClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
  tokenCollector: Address,
  collectorData: Hex,
): Promise<Hash> {
  requireAccount(walletClient, 'refundPostEscrow')

  return wrapContractCall('refundPostEscrow', () =>
    walletClient.writeContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'refundPostEscrow',
      args: [paymentInfo, amount, tokenCollector, collectorData],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}
