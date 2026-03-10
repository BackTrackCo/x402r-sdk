import type { PaymentInfo } from '@x402r/core'
import {
  approvePostEscrowRefund as coreApprovePostEscrowRefund,
  authorize as coreAuthorize,
  charge as coreCharge,
  getPostEscrowRefundAllowance as coreGetPostEscrowRefundAllowance,
  refundInEscrow as coreRefundInEscrow,
  refundPostEscrow as coreRefundPostEscrow,
  release as coreRelease,
  getPaymentAmounts,
  getPaymentState,
} from '@x402r/core'
import type { Address, Hash, Hex } from 'viem'
import { erc20Abi } from 'viem'
import type { PaymentActions, ResolvedConfig } from '../types.js'
import { requireWallet } from './utils.js'

// Minimal ABI for PreApprovalPaymentCollector.preApprove(PaymentInfo)
const preApproveAbi = [
  {
    type: 'function',
    inputs: [
      {
        name: 'paymentInfo',
        type: 'tuple',
        components: [
          { name: 'operator', type: 'address' },
          { name: 'payer', type: 'address' },
          { name: 'receiver', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'maxAmount', type: 'uint120' },
          { name: 'preApprovalExpiry', type: 'uint48' },
          { name: 'authorizationExpiry', type: 'uint48' },
          { name: 'refundExpiry', type: 'uint48' },
          { name: 'minFeeBps', type: 'uint16' },
          { name: 'maxFeeBps', type: 'uint16' },
          { name: 'feeReceiver', type: 'address' },
          { name: 'salt', type: 'uint256' },
        ],
      },
    ],
    name: 'preApprove',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

export function createPaymentActions(config: ResolvedConfig): PaymentActions {
  return {
    async authorize(
      paymentInfo: PaymentInfo,
      amount: bigint,
      tokenCollector: Address,
      collectorData: Hex,
    ): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreAuthorize(wallet, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        amount,
        tokenCollector,
        collectorData,
      })
    },
    async approveAndAuthorize(
      paymentInfo: PaymentInfo,
      amount: bigint,
    ): Promise<Hash> {
      const wallet = requireWallet(config)

      // 1. Register intent with PreApprovalPaymentCollector
      const preApproveHash = await wallet.writeContract({
        address: config.tokenCollector,
        abi: preApproveAbi,
        functionName: 'preApprove',
        args: [paymentInfo],
        chain: wallet.chain,
        account: wallet.account!,
      })
      await config.publicClient.waitForTransactionReceipt({
        hash: preApproveHash,
      })

      // 2. ERC-20 approve: payer approves tokenCollector to pull tokens
      const approveHash = await wallet.writeContract({
        address: paymentInfo.token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [config.tokenCollector, amount],
        chain: wallet.chain,
        account: wallet.account!,
      })
      await config.publicClient.waitForTransactionReceipt({
        hash: approveHash,
      })

      // 3. Authorize: operator pulls tokens into escrow via tokenCollector
      return coreAuthorize(wallet, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        amount,
        tokenCollector: config.tokenCollector,
        collectorData: '0x',
      })
    },
    async charge(
      paymentInfo: PaymentInfo,
      amount: bigint,
      tokenCollector: Address,
      collectorData: Hex,
    ): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreCharge(wallet, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        amount,
        tokenCollector,
        collectorData,
      })
    },
    async release(paymentInfo: PaymentInfo, amount: bigint): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreRelease(wallet, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        amount,
      })
    },
    async refundInEscrow(
      paymentInfo: PaymentInfo,
      amount: bigint,
    ): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreRefundInEscrow(wallet, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        amount,
      })
    },
    async refundPostEscrow(
      paymentInfo: PaymentInfo,
      amount: bigint,
      tokenCollector: Address,
      collectorData: Hex,
    ): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreRefundPostEscrow(wallet, {
        operatorAddress: config.operatorAddress,
        paymentInfo,
        amount,
        tokenCollector,
        collectorData,
      })
    },
    async approvePostEscrowRefund(
      token: Address,
      amount: bigint,
    ): Promise<Hash> {
      const wallet = requireWallet(config)
      return coreApprovePostEscrowRefund(wallet, {
        token,
        collectorAddress: config.chainConfig.receiverRefundCollector,
        amount,
      })
    },
    async getPostEscrowRefundAllowance(
      token: Address,
      owner: Address,
    ): Promise<bigint> {
      return coreGetPostEscrowRefundAllowance(config.publicClient, {
        token,
        owner,
        collectorAddress: config.chainConfig.receiverRefundCollector,
      })
    },
    async getState(paymentInfo: PaymentInfo) {
      return getPaymentState(config.publicClient, {
        operatorAddress: config.operatorAddress,
        chainId: config.chainId,
        paymentInfo,
      })
    },
    async getAmounts(paymentInfo: PaymentInfo) {
      return getPaymentAmounts(config.publicClient, {
        operatorAddress: config.operatorAddress,
        chainId: config.chainId,
        paymentInfo,
      })
    },
  }
}
