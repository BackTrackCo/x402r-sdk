import type { Address } from 'viem'
import { createPaymentInfoResolver } from '../resolver/createResolver.js'
import {
  createEventProvider,
  createRecorderProvider,
  createStoreProvider,
} from '../resolver/providers.js'
import type { PaymentInfoProvider } from '../resolver/types.js'
import type { QueryActions, ResolvedConfig } from '../types.js'

export function createQueryActions(
  config: ResolvedConfig,
  recorderAddress: Address,
): QueryActions {
  const providers: PaymentInfoProvider[] = []

  if (config.paymentStore) {
    providers.push(createStoreProvider(config.paymentStore))
  }

  providers.push(createRecorderProvider(config.publicClient, recorderAddress))

  if (config.eventFromBlock !== undefined) {
    providers.push(
      createEventProvider(
        config.publicClient,
        config.operatorAddress,
        config.eventFromBlock,
      ),
    )
  }

  const resolver = createPaymentInfoResolver(config.chainId, providers)

  return {
    getPayerPayments: (payer) => resolver.getByPayer(payer),
    getReceiverPayments: (receiver) => resolver.getByReceiver(receiver),
    getPayment: (hash) => resolver.getByHash(hash),
  }
}
