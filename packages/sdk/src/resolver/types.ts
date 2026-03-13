import type { PaymentInfo } from '@x402r/core'
import type { Address, Hex } from 'viem'

export interface PaymentInfoProvider {
  name: string
  getByPayer(chainId: number, payer: Address): Promise<PaymentInfo[]>
  getByReceiver(chainId: number, receiver: Address): Promise<PaymentInfo[]>
  getByHash(chainId: number, hash: Hex): Promise<PaymentInfo | null>
}

export interface PaymentInfoResolver {
  getByPayer(payer: Address): Promise<PaymentInfo[]>
  getByReceiver(receiver: Address): Promise<PaymentInfo[]>
  getByHash(hash: Hex): Promise<PaymentInfo | null>
}
