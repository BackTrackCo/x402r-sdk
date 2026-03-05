import type { Address, Hash, Hex, WalletClient } from 'viem'
import { paymentOperatorAbi } from '../abis/generated.js'
import { ContractCallError } from '../errors/index.js'
import type { PaymentInfo } from '../types/index.js'
import { wrapContractCall } from './error-wrapping.js'

export async function authorize(
  walletClient: WalletClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
  tokenCollector: Address,
  collectorData: Hex,
): Promise<Hash> {
  if (!walletClient.account) {
    throw new ContractCallError('authorize', {
      details: 'walletClient must have an account attached',
    })
  }

  return wrapContractCall('authorize', () =>
    walletClient.writeContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'authorize',
      args: [paymentInfo, amount, tokenCollector, collectorData],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}

export async function charge(
  walletClient: WalletClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
  tokenCollector: Address,
  collectorData: Hex,
): Promise<Hash> {
  if (!walletClient.account) {
    throw new ContractCallError('charge', {
      details: 'walletClient must have an account attached',
    })
  }

  return wrapContractCall('charge', () =>
    walletClient.writeContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'charge',
      args: [paymentInfo, amount, tokenCollector, collectorData],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}

export async function release(
  walletClient: WalletClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
): Promise<Hash> {
  if (!walletClient.account) {
    throw new ContractCallError('release', {
      details: 'walletClient must have an account attached',
    })
  }

  return wrapContractCall('release', () =>
    walletClient.writeContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'release',
      args: [paymentInfo, amount],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}
