import type { Address, Hash, Hex, WalletClient } from 'viem'
import { paymentOperatorAbi } from '../abis/generated.js'
import { ContractCallError } from '../errors/index.js'
import type { PaymentInfo } from '../types/index.js'
import { wrapContractCall } from './error-wrapping.js'

export async function refundInEscrow(
  walletClient: WalletClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
): Promise<Hash> {
  if (!walletClient.account) {
    throw new ContractCallError('refundInEscrow', {
      details: 'walletClient must have an account attached',
    })
  }

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
  if (!walletClient.account) {
    throw new ContractCallError('refundPostEscrow', {
      details: 'walletClient must have an account attached',
    })
  }

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
