import type { PaymentInfo } from '@x402r/core'
import type { ArbiterClient, MerchantClient, PayerClient } from '@x402r/sdk'
import type { Address, Hash, PublicClient, TestClient } from 'viem'

export interface SetupOptions {
  /** When false, setup() skips the initial payment authorization. Default: true. */
  authorize?: boolean
}

export interface ExampleContext {
  payer: PayerClient
  merchant: MerchantClient
  arbiter: ArbiterClient
  paymentInfo: PaymentInfo
  publicClient: PublicClient
  testClient: TestClient
  accounts: { payer: Address; merchant: Address; arbiter: Address }
  operatorAddress: Address
  PAYMENT_AMOUNT: bigint
  cleanup: () => Promise<void>
  /** Wait for a transaction to be confirmed before reading state */
  waitForTx: (hash: Hash) => Promise<void>
}
