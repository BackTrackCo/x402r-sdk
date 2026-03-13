import type { Address, Hex } from 'viem'
import type { PaymentInfo } from '../types/index.js'

export interface PaymentStore {
  save(chainId: number, hash: Hex, paymentInfo: PaymentInfo): Promise<void>
  getByPayer(chainId: number, payer: Address): Promise<PaymentInfo[]>
  getByReceiver(chainId: number, receiver: Address): Promise<PaymentInfo[]>
  getByHash(chainId: number, hash: Hex): Promise<PaymentInfo | null>
  remove(chainId: number, hash: Hex): Promise<void>
}
