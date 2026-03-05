import type { Address, Hash, PublicClient, WalletClient } from 'viem'
import { freezeAbi } from '../abis/generated.js'
import { ContractCallError } from '../errors/index.js'
import type { PaymentInfo } from '../types/index.js'
import { wrapContractCall } from './error-wrapping.js'

// ---------------------------------------------------------------------------
// Read functions
// ---------------------------------------------------------------------------

export async function isFrozen(
  publicClient: PublicClient,
  freezeAddress: Address,
  paymentInfo: PaymentInfo,
): Promise<boolean> {
  return publicClient.readContract({
    address: freezeAddress,
    abi: freezeAbi,
    functionName: 'isFrozen',
    args: [paymentInfo],
  }) as Promise<boolean>
}

// ---------------------------------------------------------------------------
// Write functions
// ---------------------------------------------------------------------------

export async function freezePayment(
  walletClient: WalletClient,
  freezeAddress: Address,
  paymentInfo: PaymentInfo,
): Promise<Hash> {
  if (!walletClient.account) {
    throw new ContractCallError('freezePayment', {
      details: 'walletClient must have an account attached',
    })
  }

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
  if (!walletClient.account) {
    throw new ContractCallError('unfreezePayment', {
      details: 'walletClient must have an account attached',
    })
  }

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
