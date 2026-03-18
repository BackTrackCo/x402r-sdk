import type { PaymentInfo } from '@x402r/core'
import type { ArbiterClient, MerchantClient, PayerClient } from '@x402r/sdk'
import type { Address, PublicClient, TestClient } from 'viem'

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
}
