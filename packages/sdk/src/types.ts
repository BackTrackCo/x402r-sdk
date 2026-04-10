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
import type { ResolvedAgent } from '@x402r/erc8004/identity'
import type { ResolvedServiceEndpoint } from '@x402r/erc8004/registration'
import type { ReputationSummary } from '@x402r/erc8004/reputation'
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
  refundRequestAddress: Address | undefined
  refundRequestEvidenceAddress: Address | undefined
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
  release(paymentInfo: PaymentInfo, amount: bigint, data?: Hex): Promise<Hash>
  /** Executes an in-escrow refund. Gated by ReceiverCondition — only the receiver (merchant) can call. */
  refundInEscrow(
    paymentInfo: PaymentInfo,
    amount: bigint,
    data?: Hex,
  ): Promise<Hash>
  refundPostEscrow(
    paymentInfo: PaymentInfo,
    amount: bigint,
    tokenCollector: Address,
    collectorData: Hex,
  ): Promise<Hash>
  approvePostEscrowRefund(token: Address, amount: bigint): Promise<Hash>
  getPostEscrowRefundAllowance(token: Address, owner: Address): Promise<bigint>
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
  // Dispute flow (RefundRequest recorder)
  request(paymentInfo: PaymentInfo, amount: bigint): Promise<Hash>
  cancel(paymentInfo: PaymentInfo): Promise<Hash>
  deny(paymentInfo: PaymentInfo): Promise<Hash>
  refuse(paymentInfo: PaymentInfo): Promise<Hash>

  // Read operations
  get(paymentInfo: PaymentInfo): Promise<RefundRequestData>
  getByKey(paymentInfoHash: Hex): Promise<RefundRequestData>
  getStatus(paymentInfo: PaymentInfo): Promise<RefundRequestStatus>
  has(paymentInfo: PaymentInfo): Promise<boolean>
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
  getCancelCount(paymentInfo: PaymentInfo): Promise<bigint>
  getCancelledAmount(
    paymentInfo: PaymentInfo,
    cancelIndex: bigint,
  ): Promise<bigint>
}

export interface EvidenceActions {
  submit(paymentInfo: PaymentInfo, cid: string): Promise<Hash>
  get(paymentInfo: PaymentInfo, index: bigint): Promise<EvidenceEntry>
  getBatch(
    paymentInfo: PaymentInfo,
    offset: bigint,
    count: bigint,
  ): Promise<GetEvidenceBatchReturnType>
  count(paymentInfo: PaymentInfo): Promise<bigint>
}

export interface FreezeActions {
  freeze(paymentInfo: PaymentInfo, data?: Hex): Promise<Hash>
  unfreeze(paymentInfo: PaymentInfo, data?: Hex): Promise<Hash>
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
// ERC-8004 action groups
// ---------------------------------------------------------------------------

export interface Erc8004PluginOptions {
  /** Identity registry address override (auto-resolved from chain by default). */
  registryAddress?: Address
  /** Reputation registry address override (auto-resolved from chain by default). */
  reputationRegistryAddress?: Address
  /** Default tag1 for rate() and getSummary() convenience methods. Default: 'starred'. */
  defaultTag1?: string
  /** Default tag2 for rate() and getSummary() convenience methods. Default: 'x402'. */
  defaultTag2?: string
}

/** Raw parameters for giveFeedback — full control over tags and metadata. */
export interface Erc8004GiveFeedbackParams {
  /** int128 on-chain — negative values represent negative feedback. */
  value: bigint
  valueDecimals: number
  tag1: string
  tag2: string
  endpoint?: string
  feedbackURI?: string
  feedbackHash?: Hex
}

/** Parsed arbiter identity from attestation extension response. */
export interface ArbiterIdentity {
  agentId: bigint
  address: Address
}

/**
 * A single agent registration from the upstream x402 reputation extension.
 * Matches the `AgentRegistration` object in the upstream spec (PR #1024).
 *
 * @experimental Upstream x402 reputation extension is not merged.
 * The shape may change. See x402-foundation/x402#931.
 */
export interface AgentRegistration {
  agentId: bigint
  /** CAIP-10 identity registry address (e.g. `eip155:8453:0x8004...` or `solana:5eykt4...:satiRkx...`). */
  agentRegistry: string
}

export interface CheckAgentResult {
  verified: boolean
  reputation: ReputationSummary | null
}

export interface Erc8004IdentityActions {
  register(agentURI?: string): Promise<Hash>
  verifyAgentId(agentId: bigint, claimedAddress: Address): Promise<boolean>
  resolveAgent(agentId: bigint): Promise<ResolvedAgent>
  isRegistered(address: Address): Promise<boolean>
  /** Verify agent on-chain and optionally check reputation in one call. */
  check(
    agentId: bigint,
    address: Address,
    reviewers?: readonly Address[],
  ): Promise<CheckAgentResult>
}

export interface Erc8004ReputationActions {
  /** Convenience — uses default tags and valueDecimals: 0. */
  rate(agentId: bigint, score: number): Promise<Hash>
  /** Convenience — uses default tags unless overridden via options. */
  getSummary(
    agentId: bigint,
    reviewers: readonly Address[],
    options?: { tag1?: string; tag2?: string },
  ): Promise<ReputationSummary>
  /** Raw — full control over tags, value, and metadata. */
  giveFeedback(
    agentId: bigint,
    params: Erc8004GiveFeedbackParams,
  ): Promise<Hash>
}

export interface Erc8004DiscoveryActions {
  resolveServiceEndpoint(
    agentId: bigint,
    serviceName: string,
  ): Promise<ResolvedServiceEndpoint>
}

// ---------------------------------------------------------------------------
// Client type
// ---------------------------------------------------------------------------

export interface X402r {
  readonly config: ResolvedConfig
  readonly payment: PaymentActions
  readonly escrow: EscrowActions | undefined
  readonly refund: RefundActions | undefined
  readonly evidence: EvidenceActions | undefined
  readonly freeze: FreezeActions | undefined
  readonly query: QueryActions | undefined
  readonly operator: OperatorActions

  readonly watch: WatchActions
  canExecute(
    slot: ConditionSlot,
    paymentInfo: PaymentInfo,
    amount: bigint,
    data?: Hex,
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
  readonly refund:
    | Pick<
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
    | undefined
  readonly evidence: EvidenceActions | undefined
  readonly freeze: Pick<FreezeActions, 'isFrozen' | 'freeze'> | undefined
  readonly query: QueryActions | undefined
  readonly operator: Pick<OperatorActions, 'getConfig' | 'getFeeAddresses'>

  readonly watch: WatchActions
  canExecute(
    slot: ConditionSlot,
    paymentInfo: PaymentInfo,
    amount: bigint,
    data?: Hex,
  ): Promise<boolean>
  extend<const T extends Record<string, unknown>>(
    fn: (client: X402r) => T,
  ): Prettify<this & T>
}

/**
 * Merchant role client. In-escrow refunds go through `payment.refundInEscrow()` —
 * the RefundRequest recorder automatically approves during execution.
 * Use `createX402r()` for full access.
 */
export interface MerchantClient {
  readonly config: ResolvedWriteConfig
  readonly payment: Pick<
    PaymentActions,
    | 'authorize'
    | 'charge'
    | 'release'
    | 'refundInEscrow'
    | 'refundPostEscrow'
    | 'approvePostEscrowRefund'
    | 'getPostEscrowRefundAllowance'
    | 'getState'
    | 'getAmounts'
  >
  readonly escrow:
    | Pick<
        EscrowActions,
        'isDuringEscrow' | 'getAuthorizationTime' | 'getDuration'
      >
    | undefined
  readonly refund:
    | Pick<
        RefundActions,
        | 'get'
        | 'getByKey'
        | 'getStatus'
        | 'has'
        | 'getStoredPaymentInfo'
        | 'getReceiverRequests'
        | 'getCancelCount'
        | 'getCancelledAmount'
      >
    | undefined
  readonly evidence: EvidenceActions | undefined
  readonly freeze: Pick<FreezeActions, 'isFrozen'> | undefined
  readonly query: QueryActions | undefined
  readonly operator: OperatorActions

  readonly watch: WatchActions
  canExecute(
    slot: ConditionSlot,
    paymentInfo: PaymentInfo,
    amount: bigint,
    data?: Hex,
  ): Promise<boolean>
  extend<const T extends Record<string, unknown>>(
    fn: (client: X402r) => T,
  ): Prettify<this & T>
}

export interface ArbiterClient {
  readonly config: ResolvedWriteConfig
  readonly payment: Pick<
    PaymentActions,
    'getState' | 'getAmounts' | 'refundInEscrow'
  >
  readonly escrow:
    | Pick<
        EscrowActions,
        'isDuringEscrow' | 'getAuthorizationTime' | 'getDuration'
      >
    | undefined
  readonly refund:
    | Pick<
        RefundActions,
        | 'deny'
        | 'refuse'
        | 'get'
        | 'getByKey'
        | 'getStatus'
        | 'has'
        | 'getStoredPaymentInfo'
        | 'getOperatorRequests'
        | 'getCancelCount'
        | 'getCancelledAmount'
      >
    | undefined
  readonly evidence: EvidenceActions | undefined
  readonly freeze: Pick<FreezeActions, 'isFrozen' | 'unfreeze'> | undefined
  readonly query: QueryActions | undefined
  readonly operator: Pick<
    OperatorActions,
    | 'getConfig'
    | 'getFeeAddresses'
    | 'getAccumulatedProtocolFees'
    | 'distributeFees'
  >

  readonly watch: WatchActions
  canExecute(
    slot: ConditionSlot,
    paymentInfo: PaymentInfo,
    amount: bigint,
    data?: Hex,
  ): Promise<boolean>
  extend<const T extends Record<string, unknown>>(
    fn: (client: X402r) => T,
  ): Prettify<this & T>
}
