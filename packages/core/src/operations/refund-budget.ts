import type { Address, Hash, Hex, PublicClient, WalletClient } from 'viem'
import { paymentOperatorAbi } from '../abis/generated.js'
import { ContractCallError } from '../errors/index.js'
import type { PaymentInfo } from '../types/index.js'
import { wrapContractCall } from './error-wrapping.js'

// ---------------------------------------------------------------------------
// Inline ERC-20 ABI (only allowance + approve — not in generated.ts)
// ---------------------------------------------------------------------------

const erc20AllowanceAbi = [
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const

// ---------------------------------------------------------------------------
// Read functions
// ---------------------------------------------------------------------------

export async function getRefundBudget(
  publicClient: PublicClient,
  token: Address,
  owner: Address,
  operatorAddress: Address,
): Promise<bigint> {
  return publicClient.readContract({
    address: token,
    abi: erc20AllowanceAbi,
    functionName: 'allowance',
    args: [owner, operatorAddress],
  })
}

// ---------------------------------------------------------------------------
// Write functions
// ---------------------------------------------------------------------------

export async function approveRefundBudget(
  walletClient: WalletClient,
  token: Address,
  operatorAddress: Address,
  amount: bigint,
): Promise<Hash> {
  if (!walletClient.account) {
    throw new ContractCallError('approveRefundBudget', {
      details: 'walletClient must have an account attached',
    })
  }

  return wrapContractCall('approveRefundBudget', () =>
    walletClient.writeContract({
      address: token,
      abi: erc20AllowanceAbi,
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
