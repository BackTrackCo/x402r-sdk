import type { Address, Hash, WalletClient } from 'viem'
import { freezeAbi } from '../abis/generated.js'
import type { PaymentInfo } from '../types/index.js'
import { requireAccount, wrapContractCall } from './error-wrapping.js'

export async function freezePayment(
  walletClient: WalletClient,
  freezeAddress: Address,
  paymentInfo: PaymentInfo,
): Promise<Hash> {
  requireAccount(walletClient, 'freezePayment')

  return wrapContractCall('freezePayment', () =>
    walletClient.writeContract({
      address: freezeAddress,
      abi: freezeAbi,
      functionName: 'freeze',
      args: [paymentInfo],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}

export async function unfreezePayment(
  walletClient: WalletClient,
  freezeAddress: Address,
  paymentInfo: PaymentInfo,
): Promise<Hash> {
  requireAccount(walletClient, 'unfreezePayment')

  return wrapContractCall('unfreezePayment', () =>
    walletClient.writeContract({
      address: freezeAddress,
      abi: freezeAbi,
      functionName: 'unfreeze',
      args: [paymentInfo],
      chain: walletClient.chain,
      account: walletClient.account!,
    }),
  )
}
