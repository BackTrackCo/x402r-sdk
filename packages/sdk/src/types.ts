import type {
  ConditionSlot,
  EvidenceEntry,
  FeeAddresses,
  FeeCalculationResult,
  OperatorSlots,
  PaymentAmounts,
  PaymentInfo,
  RefundRequestData,
  RefundRequestStatus,
  X402rChainConfig,
} from '@x402r/core'
import type { Address, Hash, Hex, PublicClient, WalletClient } from 'viem'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface X402rConfig {
  publicClient: PublicClient
  walletClient?: WalletClient
  operatorAddress: Address
}

export interface ResolvedConfig {
  publicClient: PublicClient
  walletClient: WalletClient | undefined
  operatorAddress: Address
  chainId: number
  chainConfig: X402rChainConfig
}

// ---------------------------------------------------------------------------
// Action group interfaces
// ---------------------------------------------------------------------------

export interface PaymentActions {
  getState(paymentInfo: PaymentInfo): Promise<PaymentAmounts>
  getAmounts(paymentInfo: PaymentInfo): Promise<PaymentAmounts>
  authorize(
    paymentInfo: PaymentInfo,
    amount: bigint,
    tokenCollector?: Address,
    collectorData?: Hex,
  ): Promise<Hash>
  charge(
    paymentInfo: PaymentInfo,
    amount: bigint,
    tokenCollector?: Address,
    collectorData?: Hex,
  ): Promise<Hash>
  release(paymentInfo: PaymentInfo, amount: bigint): Promise<Hash>
  refundInEscrow(paymentInfo: PaymentInfo, amount: bigint): Promise<Hash>
  refundPostEscrow(
    paymentInfo: PaymentInfo,
    amount: bigint,
    tokenCollector?: Address,
    collectorData?: Hex,
  ): Promise<Hash>
}

export interface RefundActions {
  hasRequest(paymentInfo: PaymentInfo, nonce: bigint): Promise<boolean>
  getRequestStatus(
    paymentInfo: PaymentInfo,
    nonce: bigint,
  ): Promise<RefundRequestStatus>
  getRequest(
    paymentInfo: PaymentInfo,
    nonce: bigint,
  ): Promise<RefundRequestData>
  request(
    paymentInfo: PaymentInfo,
    amount: bigint,
    nonce: bigint,
  ): Promise<Hash>
  approveWithSignature(
    paymentInfo: PaymentInfo,
    nonce: bigint,
    amount: bigint,
    expiry: number,
    signature: Hex,
  ): Promise<Hash>
  deny(paymentInfo: PaymentInfo, nonce: bigint): Promise<Hash>
  refuse(paymentInfo: PaymentInfo, nonce: bigint): Promise<Hash>
  cancel(paymentInfo: PaymentInfo, nonce: bigint): Promise<Hash>
  getBudget(token: Address, owner: Address): Promise<bigint>
  approveBudget(token: Address, amount: bigint): Promise<Hash>
}

export interface EvidenceActions {
  get(
    paymentInfo: PaymentInfo,
    nonce: bigint,
    index: bigint,
  ): Promise<EvidenceEntry>
  getCount(paymentInfo: PaymentInfo, nonce: bigint): Promise<bigint>
  getBatch(
    paymentInfo: PaymentInfo,
    nonce: bigint,
    offset: bigint,
    count: bigint,
  ): Promise<{ entries: EvidenceEntry[]; total: bigint }>
  submit(paymentInfo: PaymentInfo, nonce: bigint, cid: string): Promise<Hash>
}

export interface FreezeActions {
  isFrozen(freezeAddress: Address, paymentInfo: PaymentInfo): Promise<boolean>
  freeze(freezeAddress: Address, paymentInfo: PaymentInfo): Promise<Hash>
  unfreeze(freezeAddress: Address, paymentInfo: PaymentInfo): Promise<Hash>
}

export interface OperatorActions {
  getConfig(): Promise<OperatorSlots>
  getEscrowAddress(): Promise<Address>
  getConditionAddress(slot: ConditionSlot): Promise<Address>
}

export interface FeeActions {
  getAddresses(): Promise<FeeAddresses>
  calculate(
    paymentInfo: PaymentInfo,
    amount: bigint,
    caller: Address,
  ): Promise<FeeCalculationResult>
  distribute(token: Address): Promise<Hash>
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface X402r {
  payment: PaymentActions
  refund: RefundActions
  evidence: EvidenceActions
  freeze: FreezeActions
  operator: OperatorActions
  fee: FeeActions
  config: ResolvedConfig
  extend: <T extends Record<string, unknown>>(
    fn: (client: X402r) => T,
  ) => X402r & T
}
