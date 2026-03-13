import type { PaymentInfo, PaymentInfoProvider } from '@x402r/core'
import {
  approvePostEscrowRefund as coreApprovePostEscrowRefund,
  authorize as coreAuthorize,
  charge as coreCharge,
  getPostEscrowRefundAllowance as coreGetPostEscrowRefundAllowance,
  refundInEscrow as coreRefundInEscrow,
  refundPostEscrow as coreRefundPostEscrow,
  release as coreRelease,
  createEventProvider,
  createPaymentInfoResolver,
  createRecorderProvider,
  createStoreProvider,
  getPaymentAmounts,
  getPaymentState,
} from '@x402r/core'
import type { Address, Hash, Hex } from 'viem'
import type { PaymentActions, ResolvedConfig } from '../types.js'
import { requireWallet } from './utils.js'

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
    ...buildResolverMethods(config),
  }
}

function buildResolverMethods(config: ResolvedConfig) {
  const providers: PaymentInfoProvider[] = []

  if (config.paymentStore) {
    providers.push(createStoreProvider(config.paymentStore))
  }
  if (config.paymentIndexRecorderAddress) {
    providers.push(
      createRecorderProvider(
        config.publicClient,
        config.paymentIndexRecorderAddress,
      ),
    )
  }
  providers.push(
    createEventProvider(config.publicClient, config.operatorAddress),
  )

  const resolver = createPaymentInfoResolver(config.chainId, providers)

  return {
    getPayerPayments: (payer: Address) => resolver.getByPayer(payer),
    getReceiverPayments: (receiver: Address) =>
      resolver.getByReceiver(receiver),
    getPaymentInfo: (hash: Hex) => resolver.getByHash(hash),
  }
}
