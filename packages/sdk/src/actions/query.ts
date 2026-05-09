import type { Address } from 'viem'
import { createPaymentInfoResolver } from '../resolver/createResolver.js'
import {
  createEventProvider,
  createHookProvider,
  createStoreProvider,
} from '../resolver/providers.js'
import type { PaymentInfoProvider } from '../resolver/types.js'
import type { QueryActions, ResolvedConfig } from '../types.js'

export function createQueryActions(
  config: ResolvedConfig,
  hookAddress: Address,
): QueryActions {
  const providers: PaymentInfoProvider[] = []

  if (config.paymentStore) {
    providers.push(createStoreProvider(config.paymentStore))
  }

  // Auto-scope hook reads to the configured operator. The canonical
  // PaymentIndexRecorderHook is a chain singleton aggregating across every
  // operator routing through HookCombinator — without this filter, queries
  // would return mingled records in multi-operator deployments. Matches
  // createEventProvider's per-operator scoping below.
  providers.push(
    createHookProvider(config.publicClient, hookAddress, {
      operatorAddress: config.operatorAddress,
    }),
  )

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
