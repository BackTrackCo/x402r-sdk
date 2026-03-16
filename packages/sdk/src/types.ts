import type {
  ConditionSlot,
  EvidenceEntry,
  FeeAddresses,
  FeeCalculationResult,
  GetAuthorizedFeesReturnType,
  GetEvidenceBatchReturnType,
  GetOperatorRefundRequestsReturnType,
  GetPayerRefundRequestsReturnType,
  GetReceiverRefundRequestsReturnType,
  OperatorSlots,
  PaymentAmounts,
  PaymentInfo,
  RefundRequestData,
  RefundRequestStatus,
  X402rChainConfig,
} from '@x402r/core'
import type { Address, Hash, Hex, PublicClient, WalletClient } from 'viem'
import type { PaymentStore } from './store/types.js'

/** Force TypeScript to flatten intersection types for cleaner IDE tooltips. */
export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

// ---------------------------------------------------------------------------
// User-facing config
// ---------------------------------------------------------------------------

export interface X402rConfig {
  publicClient: PublicClient
  walletClient?: WalletClient
  operatorAddress: Address
  chainId?: number
  network?: string

  // Protocol address overrides (resolved from chain config by default)
  refundRequestAddress?: Address
  refundRequestEvidenceAddress?: Address

  // Optional condition plugin addresses (per-operator, not in chain config)
  escrowPeriodAddress?: Address
  freezeAddress?: Address

  // Payment retrieval
  paymentIndexRecorderAddress?: Address
  paymentStore?: PaymentStore
  /** Starting block for event-based payment lookups. Required to enable the event fallback provider. */
  eventFromBlock?: bigint
}

// ---------------------------------------------------------------------------
// Internal resolved config
// ---------------------------------------------------------------------------

export interface ResolvedConfig {
  publicClient: PublicClient
  walletClient: WalletClient | undefined
  operatorAddress: Address
  chainId: number
  chainConfig: X402rChainConfig
  refundRequestAddress: Address
  refundRequestEvidenceAddress: Address
  escrowPeriodAddress: Address | undefined
  freezeAddress: Address | undefined
  paymentIndexRecorderAddress: Address | undefined
  paymentStore: PaymentStore | undefined
  eventFromBlock: bigint | undefined
}

export interface ResolvedWriteConfig extends ResolvedConfig {
  walletClient: WalletClient
}

// ---------------------------------------------------------------------------
// Action group interfaces
// ---------------------------------------------------------------------------

export interface PaymentActions {
  authorize(
    paymentInfo: PaymentInfo,
    amount: bigint,
    tokenCollector: Address,
    collectorData: Hex,
  ): Promise<Hash>
  charge(
    paymentInfo: PaymentInfo,
    amount: bigint,
    tokenCollector: Address,
    collectorData: Hex,
  ): Promise<Hash>
  release(paymentInfo: PaymentInfo, amount: bigint): Promise<Hash>
  getState(
    paymentInfo: PaymentInfo,
  ): Promise<readonly [boolean, bigint, bigint]>
  getAmounts(paymentInfo: PaymentInfo): Promise<PaymentAmounts>
}

export interface EscrowActions {
  isDuringEscrow(paymentInfo: PaymentInfo): Promise<boolean>
  getAuthorizationTime(paymentInfo: PaymentInfo): Promise<bigint>
  getDuration(): Promise<bigint>
}

export interface RefundActions {
  // Dispute flow (RefundRequest contract)
  request(
    paymentInfo: PaymentInfo,
    amount: bigint,
    nonce: bigint,
  ): Promise<Hash>
  cancel(paymentInfo: PaymentInfo, nonce: bigint): Promise<Hash>
  deny(paymentInfo: PaymentInfo, nonce: bigint): Promise<Hash>
  refuse(paymentInfo: PaymentInfo, nonce: bigint): Promise<Hash>
  approve(
    paymentInfo: PaymentInfo,
    nonce: bigint,
    amount: bigint,
  ): Promise<Hash>

  // Read operations
  get(paymentInfo: PaymentInfo, nonce: bigint): Promise<RefundRequestData>
  getByKey(compositeKey: Hex): Promise<RefundRequestData>
  getStatus(
    paymentInfo: PaymentInfo,
    nonce: bigint,
  ): Promise<RefundRequestStatus>
  has(paymentInfo: PaymentInfo, nonce: bigint): Promise<boolean>
  getStoredPaymentInfo(paymentInfoHash: Hex): Promise<PaymentInfo>
  getPayerRequests(
    payer: Address,
    offset: bigint,
    count: bigint,
  ): Promise<GetPayerRefundRequestsReturnType>
  getReceiverRequests(
    receiver: Address,
    offset: bigint,
    count: bigint,
  ): Promise<GetReceiverRefundRequestsReturnType>
  getOperatorRequests(
    operator: Address,
    offset: bigint,
    count: bigint,
  ): Promise<GetOperatorRefundRequestsReturnType>
  getCancelCount(paymentInfo: PaymentInfo, nonce: bigint): Promise<bigint>
  getCancelledAmount(
    paymentInfo: PaymentInfo,
    nonce: bigint,
    cancelIndex: bigint,
  ): Promise<bigint>

  // Refund budget (merchant self-service)
  approveBudget(token: Address, amount: bigint): Promise<Hash>
  getBudget(token: Address, owner: Address): Promise<bigint>
  refundInEscrow(paymentInfo: PaymentInfo, amount: bigint): Promise<Hash>
  refundPostEscrow(
    paymentInfo: PaymentInfo,
    amount: bigint,
    tokenCollector: Address,
    collectorData: Hex,
  ): Promise<Hash>
}

export interface EvidenceActions {
  submit(paymentInfo: PaymentInfo, nonce: bigint, cid: string): Promise<Hash>
  get(
    paymentInfo: PaymentInfo,
    nonce: bigint,
    index: bigint,
  ): Promise<EvidenceEntry>
  getBatch(
    paymentInfo: PaymentInfo,
    nonce: bigint,
    offset: bigint,
    count: bigint,
  ): Promise<GetEvidenceBatchReturnType>
  count(paymentInfo: PaymentInfo, nonce: bigint): Promise<bigint>
}

export interface FreezeActions {
  freeze(paymentInfo: PaymentInfo): Promise<Hash>
  unfreeze(paymentInfo: PaymentInfo): Promise<Hash>
  isFrozen(paymentInfo: PaymentInfo): Promise<boolean>
}

export interface QueryActions {
  getPayerPayments(payer: Address): Promise<PaymentInfo[]>
  getReceiverPayments(receiver: Address): Promise<PaymentInfo[]>
  getPayment(hash: Hex): Promise<PaymentInfo | null>
}

export interface OperatorActions {
  getConfig(): Promise<OperatorSlots>
  getFeeAddresses(): Promise<FeeAddresses>
  calculateFees(
    paymentInfo: PaymentInfo,
    amount: bigint,
  ): Promise<FeeCalculationResult>
  calculateOperatorFeeBps(
    paymentInfo: PaymentInfo,
    amount: bigint,
  ): Promise<bigint>
  calculateProtocolFeeBps(
    paymentInfo: PaymentInfo,
    amount: bigint,
  ): Promise<bigint>
  getAuthorizedFees(paymentInfoHash: Hex): Promise<GetAuthorizedFeesReturnType>
  getAccumulatedProtocolFees(token: Address): Promise<bigint>
  distributeFees(token: Address): Promise<Hash>
}

// TODO: type event logs per-event (e.g. AuthorizationCreatedLog) once ABI event inference is added
export interface WatchActions {
  onPayment(callback: (log: unknown) => void): () => void
  onRefundRequest(callback: (log: unknown) => void): () => void
  onRefundExecuted(callback: (log: unknown) => void): () => void
  onFeeDistribution(callback: (log: unknown) => void): () => void
}

// ---------------------------------------------------------------------------
// Client type
// ---------------------------------------------------------------------------

export interface X402r {
  readonly config: ResolvedConfig
  readonly payment: PaymentActions
  readonly escrow: EscrowActions | undefined
  readonly refund: RefundActions
  readonly evidence: EvidenceActions
  readonly freeze: FreezeActions | undefined
  readonly query: QueryActions | undefined
  readonly operator: OperatorActions

  readonly watch: WatchActions
  canExecute(
    slot: ConditionSlot,
    paymentInfo: PaymentInfo,
    amount: bigint,
  ): Promise<boolean>
  extend<const T extends Record<string, unknown>>(
    fn: (client: X402r) => T,
  ): Prettify<this & T>
}

// ---------------------------------------------------------------------------
// Role-based preset types (DX narrowing — not a security boundary)
// ---------------------------------------------------------------------------

export interface PayerClient {
  readonly config: ResolvedWriteConfig
  readonly payment: Pick<PaymentActions, 'getState' | 'getAmounts'>
  readonly escrow:
    | Pick<
        EscrowActions,
        'isDuringEscrow' | 'getAuthorizationTime' | 'getDuration'
      >
    | undefined
  readonly refund: Pick<
    RefundActions,
    | 'request'
    | 'cancel'
    | 'get'
    | 'getByKey'
    | 'getStatus'
    | 'has'
    | 'getStoredPaymentInfo'
    | 'getPayerRequests'
    | 'getCancelCount'
    | 'getCancelledAmount'
  >
  readonly evidence: EvidenceActions
  readonly freeze: Pick<FreezeActions, 'isFrozen'> | undefined
  readonly query: QueryActions | undefined
  readonly operator: Pick<OperatorActions, 'getConfig' | 'getFeeAddresses'>

  readonly watch: WatchActions
  canExecute(
    slot: ConditionSlot,
    paymentInfo: PaymentInfo,
    amount: bigint,
  ): Promise<boolean>
  extend<const T extends Record<string, unknown>>(
    fn: (client: X402r) => T,
  ): Prettify<this & T>
}

export interface MerchantClient {
  readonly config: ResolvedWriteConfig
  readonly payment: PaymentActions
  readonly escrow:
    | Pick<
        EscrowActions,
        'isDuringEscrow' | 'getAuthorizationTime' | 'getDuration'
      >
    | undefined
  readonly refund: Pick<
    RefundActions,
    | 'refuse'
    | 'get'
    | 'getByKey'
    | 'getStatus'
    | 'has'
    | 'getStoredPaymentInfo'
    | 'getReceiverRequests'
    | 'getCancelCount'
    | 'getCancelledAmount'
    | 'approveBudget'
    | 'getBudget'
    | 'refundInEscrow'
    | 'refundPostEscrow'
  >
  readonly evidence: EvidenceActions
  readonly freeze: Pick<FreezeActions, 'isFrozen'> | undefined
  readonly query: QueryActions | undefined
  readonly operator: OperatorActions

  readonly watch: WatchActions
  canExecute(
    slot: ConditionSlot,
    paymentInfo: PaymentInfo,
    amount: bigint,
  ): Promise<boolean>
  extend<const T extends Record<string, unknown>>(
    fn: (client: X402r) => T,
  ): Prettify<this & T>
}

export interface ArbiterClient {
  readonly config: ResolvedWriteConfig
  readonly payment: Pick<PaymentActions, 'getState' | 'getAmounts'>
  readonly escrow:
    | Pick<
        EscrowActions,
        'isDuringEscrow' | 'getAuthorizationTime' | 'getDuration'
      >
    | undefined
  readonly refund: Pick<
    RefundActions,
    | 'deny'
    | 'approve'
    | 'get'
    | 'getByKey'
    | 'getStatus'
    | 'has'
    | 'getStoredPaymentInfo'
    | 'getOperatorRequests'
    | 'getCancelCount'
    | 'getCancelledAmount'
  >
  readonly evidence: EvidenceActions
  readonly freeze: FreezeActions | undefined
  readonly query: QueryActions | undefined
  readonly operator: Pick<OperatorActions, 'getConfig' | 'getFeeAddresses'>

  readonly watch: WatchActions
  canExecute(
    slot: ConditionSlot,
    paymentInfo: PaymentInfo,
    amount: bigint,
  ): Promise<boolean>
  extend<const T extends Record<string, unknown>>(
    fn: (client: X402r) => T,
  ): Prettify<this & T>
}
