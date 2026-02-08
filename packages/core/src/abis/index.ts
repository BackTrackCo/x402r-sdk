/**
 * Contract ABIs for X402r SDK
 * @module abis
 */

/**
 * PaymentInfo tuple components (reused across ABIs)
 */
const paymentInfoComponents = [
  { name: "operator", type: "address" },
  { name: "payer", type: "address" },
  { name: "receiver", type: "address" },
  { name: "token", type: "address" },
  { name: "maxAmount", type: "uint120" },
  { name: "preApprovalExpiry", type: "uint48" },
  { name: "authorizationExpiry", type: "uint48" },
  { name: "refundExpiry", type: "uint48" },
  { name: "minFeeBps", type: "uint16" },
  { name: "maxFeeBps", type: "uint16" },
  { name: "feeReceiver", type: "address" },
  { name: "salt", type: "uint256" },
] as const;

/**
 * PaymentOperator ABI - Main operator contract for payment flows
 */
export const PaymentOperatorABI = [
  // Functions
  {
    name: "authorize",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
      { name: "tokenCollector", type: "address" },
      { name: "collectorData", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "charge",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
      { name: "tokenCollector", type: "address" },
      { name: "collectorData", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "release",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "refundInEscrow",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint120" },
    ],
    outputs: [],
  },
  {
    name: "refundPostEscrow",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
      { name: "tokenCollector", type: "address" },
      { name: "collectorData", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "distributeFees",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "token", type: "address" }],
    outputs: [],
  },
  {
    name: "paymentExists",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentInfoHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getPaymentInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentInfoHash", type: "bytes32" }],
    outputs: [{ name: "", type: "tuple", components: paymentInfoComponents }],
  },
  {
    name: "isInEscrow",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentInfoHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getPaymentState",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentInfo", type: "tuple", components: paymentInfoComponents }],
    outputs: [{ name: "state", type: "uint8" }],
  },
  {
    name: "getPayerPayments",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "payer", type: "address" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    name: "getReceiverPayments",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "receiver", type: "address" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    name: "ESCROW",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "FEE_RECIPIENT",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "FEE_CALCULATOR",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "PROTOCOL_FEE_CONFIG",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  // Condition slots
  {
    name: "AUTHORIZE_CONDITION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "CHARGE_CONDITION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "RELEASE_CONDITION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "REFUND_IN_ESCROW_CONDITION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "REFUND_POST_ESCROW_CONDITION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  // Recorder slots
  {
    name: "AUTHORIZE_RECORDER",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "CHARGE_RECORDER",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "RELEASE_RECORDER",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "REFUND_IN_ESCROW_RECORDER",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "REFUND_POST_ESCROW_RECORDER",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  // Events
  {
    name: "AuthorizationCreated",
    type: "event",
    inputs: [
      { name: "paymentInfoHash", type: "bytes32", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "receiver", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ChargeExecuted",
    type: "event",
    inputs: [
      { name: "paymentInfoHash", type: "bytes32", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "receiver", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ReleaseExecuted",
    type: "event",
    inputs: [
      {
        name: "paymentInfo",
        type: "tuple",
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "RefundInEscrowExecuted",
    type: "event",
    inputs: [
      {
        name: "paymentInfo",
        type: "tuple",
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: "payer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "RefundPostEscrowExecuted",
    type: "event",
    inputs: [
      {
        name: "paymentInfo",
        type: "tuple",
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: "payer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "FeesDistributed",
    type: "event",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "protocolAmount", type: "uint256", indexed: false },
      { name: "arbiterAmount", type: "uint256", indexed: false },
    ],
  },
] as const;

/**
 * RefundRequestData components (reused in ABI)
 */
const refundRequestDataComponents = [
  { name: "paymentInfoHash", type: "bytes32" },
  { name: "nonce", type: "uint256" },
  { name: "amount", type: "uint120" },
  { name: "status", type: "uint8" },
] as const;

/**
 * RefundRequest ABI - Contract for managing refund requests
 *
 * Key changes from previous version:
 * - All methods now take (paymentInfo, nonce) to identify specific refund requests
 * - requestRefund also takes amount parameter
 * - Paginated query functions use (offset, count) pattern
 */
export const RefundRequestABI = [
  // ============ Write Functions ============
  {
    name: "requestRefund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint120" },
      { name: "nonce", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "updateStatus",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "nonce", type: "uint256" },
      { name: "newStatus", type: "uint8" },
    ],
    outputs: [],
  },
  {
    name: "cancelRefundRequest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "nonce", type: "uint256" },
    ],
    outputs: [],
  },
  // ============ View Functions ============
  {
    name: "getRefundRequest",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "nonce", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: refundRequestDataComponents,
      },
    ],
  },
  {
    name: "hasRefundRequest",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "nonce", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getRefundRequestStatus",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "nonce", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "getRefundRequestByKey",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "compositeKey", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: refundRequestDataComponents,
      },
    ],
  },
  // ============ Paginated Query Functions ============
  {
    name: "getPayerRefundRequests",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "payer", type: "address" },
      { name: "offset", type: "uint256" },
      { name: "count", type: "uint256" },
    ],
    outputs: [
      { name: "keys", type: "bytes32[]" },
      { name: "total", type: "uint256" },
    ],
  },
  {
    name: "getReceiverRefundRequests",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "receiver", type: "address" },
      { name: "offset", type: "uint256" },
      { name: "count", type: "uint256" },
    ],
    outputs: [
      { name: "keys", type: "bytes32[]" },
      { name: "total", type: "uint256" },
    ],
  },
  {
    name: "getPayerRefundRequest",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "payer", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "getReceiverRefundRequest",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "receiver", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  // ============ Count Functions ============
  {
    name: "payerRefundRequestCount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "payer", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "receiverRefundRequestCount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "receiver", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // ============ Events ============
  {
    name: "RefundRequested",
    type: "event",
    inputs: [
      {
        name: "paymentInfo",
        type: "tuple",
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: "payer", type: "address", indexed: true },
      { name: "receiver", type: "address", indexed: true },
      { name: "amount", type: "uint120", indexed: false },
      { name: "nonce", type: "uint256", indexed: false },
    ],
  },
  {
    name: "RefundRequestStatusUpdated",
    type: "event",
    inputs: [
      {
        name: "paymentInfo",
        type: "tuple",
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: "oldStatus", type: "uint8", indexed: false },
      { name: "newStatus", type: "uint8", indexed: false },
      { name: "updatedBy", type: "address", indexed: true },
      { name: "nonce", type: "uint256", indexed: false },
    ],
  },
  {
    name: "RefundRequestCancelled",
    type: "event",
    inputs: [
      {
        name: "paymentInfo",
        type: "tuple",
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: "payer", type: "address", indexed: true },
      { name: "nonce", type: "uint256", indexed: false },
    ],
  },
] as const;

/**
 * IRecorder interface ABI
 *
 * Recorders are called after an action is executed to update state.
 * Amount and caller are provided for convenience - recorders may ignore them.
 */
export const IRecorderABI = [
  {
    type: "function",
    name: "record",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
      { name: "caller", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

/**
 * IFeeCalculator interface ABI
 *
 * Fee calculators compute fee in basis points for a given payment action.
 * Used by both protocol-level and operator-level fee calculators.
 */
export const IFeeCalculatorABI = [
  {
    type: "function",
    name: "calculateFee",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
      { name: "caller", type: "address" },
    ],
    outputs: [{ name: "feeBps", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/**
 * EscrowPeriod contract ABI
 *
 * EscrowPeriod implements both IRecorder and ICondition:
 * - As IRecorder: record() stores authorization timestamp when payment is authorized
 * - As ICondition: check() returns true only after escrow period has passed
 *
 * The same deployed address is used for both authorizeRecorder and releaseCondition
 * in PaymentOperatorConfig.
 *
 * @remarks
 * This contract does NOT handle freezing - that's done by the separate Freeze contract.
 */
export const EscrowPeriodABI = [
  // ICondition implementation - checks if escrow period has passed
  {
    name: "check",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
      { name: "caller", type: "address" },
    ],
    outputs: [{ name: "allowed", type: "bool" }],
  },
  // IRecorder implementation - records authorization timestamp
  {
    name: "record",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
      { name: "caller", type: "address" },
    ],
    outputs: [],
  },
  // View functions
  {
    name: "getAuthorizationTime",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentInfo", type: "tuple", components: paymentInfoComponents }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "isDuringEscrowPeriod",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentInfo", type: "tuple", components: paymentInfoComponents }],
    outputs: [{ name: "", type: "bool" }],
  },
  // Immutables
  {
    name: "ESCROW_PERIOD",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "ESCROW",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "AUTHORIZED_CODEHASH",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  // Mapping accessor
  {
    name: "authorizationTimes",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentInfoHash", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Events
  {
    name: "AuthorizationTimeRecorded",
    type: "event",
    inputs: [
      {
        name: "paymentInfo",
        type: "tuple",
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: "authorizationTime", type: "uint256", indexed: false },
    ],
  },
  // Errors
  {
    name: "UnauthorizedRecorder",
    type: "error",
    inputs: [],
  },
] as const;

/**
 * AuthCaptureEscrow ABI - Base escrow contract (subset for SDK needs)
 */
export const AuthCaptureEscrowABI = [
  {
    name: "getHash",
    type: "function",
    stateMutability: "pure",
    inputs: [{ name: "paymentInfo", type: "tuple", components: paymentInfoComponents }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "paymentState",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentInfoHash", type: "bytes32" }],
    outputs: [
      { name: "hasCollectedPayment", type: "bool" },
      { name: "capturableAmount", type: "uint120" },
      { name: "refundableAmount", type: "uint120" },
    ],
  },
  // Events
  {
    name: "PaymentAuthorized",
    type: "event",
    inputs: [
      { name: "paymentInfoHash", type: "bytes32", indexed: true },
      {
        name: "paymentInfo",
        type: "tuple",
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: "amount", type: "uint256", indexed: false },
      { name: "tokenCollector", type: "address", indexed: false },
    ],
  },
] as const;

/**
 * StaticAddressCondition ABI - Condition that checks if caller matches a designated address
 *
 * @remarks
 * The check() function takes 3 parameters matching ICondition interface:
 * - paymentInfo: The payment details tuple
 * - amount: The amount being checked (uint256)
 * - caller: The address calling the condition check
 */
export const StaticAddressConditionABI = [
  {
    name: "check",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
      { name: "caller", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "DESIGNATED_ADDRESS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/**
 * Freeze contract ABI
 *
 * Freeze implements ICondition and manages payment freezing state.
 * FreezePolicy has been merged into Freeze — freeze/unfreeze authorization
 * is now handled directly via FREEZE_CONDITION and UNFREEZE_CONDITION immutables.
 * - freeze(): Freezes a payment (caller must pass FREEZE_CONDITION)
 * - unfreeze(): Unfreezes a payment (caller must pass UNFREEZE_CONDITION)
 * - check(): Returns false if payment is frozen, true otherwise
 */
export const FreezeABI = [
  // ICondition implementation - returns false if frozen
  {
    name: "check",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
      { name: "caller", type: "address" },
    ],
    outputs: [{ name: "allowed", type: "bool" }],
  },
  // Freeze management
  {
    name: "freeze",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "paymentInfo", type: "tuple", components: paymentInfoComponents }],
    outputs: [],
  },
  {
    name: "unfreeze",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "paymentInfo", type: "tuple", components: paymentInfoComponents }],
    outputs: [],
  },
  {
    name: "isFrozen",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentInfo", type: "tuple", components: paymentInfoComponents }],
    outputs: [{ name: "", type: "bool" }],
  },
  // Immutables
  {
    name: "ESCROW",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "FREEZE_CONDITION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "UNFREEZE_CONDITION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "FREEZE_DURATION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "ESCROW_PERIOD_CONTRACT",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  // Mapping accessor
  {
    name: "frozenUntil",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentInfoHash", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Events
  {
    name: "PaymentFrozen",
    type: "event",
    inputs: [
      {
        name: "paymentInfo",
        type: "tuple",
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: "caller", type: "address", indexed: true },
    ],
  },
  {
    name: "PaymentUnfrozen",
    type: "event",
    inputs: [
      {
        name: "paymentInfo",
        type: "tuple",
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: "caller", type: "address", indexed: true },
    ],
  },
  // Errors
  {
    name: "FreezeWindowExpired",
    type: "error",
    inputs: [],
  },
  {
    name: "UnauthorizedFreeze",
    type: "error",
    inputs: [],
  },
  {
    name: "AlreadyFrozen",
    type: "error",
    inputs: [],
  },
  {
    name: "NotFrozen",
    type: "error",
    inputs: [],
  },
  {
    name: "UnauthorizedUnfreeze",
    type: "error",
    inputs: [],
  },
] as const;

/**
 * ProtocolFeeConfig ABI - Shared protocol fee configuration contract
 *
 * Owned by protocol multisig. Contains:
 * - A swappable IFeeCalculator with 7-day timelock
 * - Protocol fee recipient address
 */
export const ProtocolFeeConfigABI = [
  // View functions
  {
    name: "getProtocolFeeBps",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
      { name: "caller", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getProtocolFeeRecipient",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "calculator",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "protocolFeeRecipient",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  // Constants
  {
    name: "TIMELOCK_DELAY",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "MAX_PROTOCOL_FEE_BPS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Timelock state
  {
    name: "pendingCalculator",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "pendingCalculatorTimestamp",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "pendingRecipient",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "pendingRecipientTimestamp",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/**
 * ArbiterRegistry ABI - On-chain registry for arbiters
 *
 * Arbiters self-register with a URI pointing to their metadata/API endpoint.
 * The URI can be:
 * - https://arbiter.example.com/api/disputes
 * - ipfs://QmXxx...
 * - Any other resolvable URI
 */
export const ArbiterRegistryABI = [
  // Write functions
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "uri", type: "string" }],
    outputs: [],
  },
  {
    name: "updateUri",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "newUri", type: "string" }],
    outputs: [],
  },
  {
    name: "deregister",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // View functions
  {
    name: "getUri",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "arbiter", type: "address" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "isRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "arbiter", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "arbiterCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getArbiters",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "count", type: "uint256" },
    ],
    outputs: [
      { name: "arbiters", type: "address[]" },
      { name: "uris", type: "string[]" },
      { name: "total", type: "uint256" },
    ],
  },
  // Events
  {
    name: "ArbiterRegistered",
    type: "event",
    inputs: [
      { name: "arbiter", type: "address", indexed: true },
      { name: "uri", type: "string", indexed: false },
    ],
  },
  {
    name: "ArbiterUriUpdated",
    type: "event",
    inputs: [
      { name: "arbiter", type: "address", indexed: true },
      { name: "oldUri", type: "string", indexed: false },
      { name: "newUri", type: "string", indexed: false },
    ],
  },
  {
    name: "ArbiterDeregistered",
    type: "event",
    inputs: [{ name: "arbiter", type: "address", indexed: true }],
  },
] as const;

/**
 * RefundRequestEvidence ABI - Contract for submitting and querying dispute evidence
 *
 * Evidence is submitted as IPFS CIDs tied to a payment+nonce. Only payer, receiver,
 * or arbiter (as determined by the operator's refund condition) can submit evidence.
 * A pending refund request must exist before evidence can be submitted.
 */
export const RefundRequestEvidenceABI = [
  // ============ Write Functions ============
  {
    name: "submitEvidence",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "nonce", type: "uint256" },
      { name: "cid", type: "string" },
    ],
    outputs: [],
  },
  // ============ View Functions ============
  {
    name: "getEvidence",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "nonce", type: "uint256" },
      { name: "index", type: "uint256" },
    ],
    outputs: [
      { name: "submitter", type: "address" },
      { name: "role", type: "uint8" },
      { name: "timestamp", type: "uint48" },
      { name: "cid", type: "string" },
    ],
  },
  {
    name: "getEvidenceCount",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "nonce", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getEvidenceBatch",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "nonce", type: "uint256" },
      { name: "offset", type: "uint256" },
      { name: "count", type: "uint256" },
    ],
    outputs: [
      {
        name: "entries",
        type: "tuple[]",
        components: [
          { name: "submitter", type: "address" },
          { name: "role", type: "uint8" },
          { name: "timestamp", type: "uint48" },
          { name: "cid", type: "string" },
        ],
      },
      { name: "total", type: "uint256" },
    ],
  },
  // ============ Immutables ============
  {
    name: "REFUND_REQUEST",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  // ============ Events ============
  {
    name: "EvidenceSubmitted",
    type: "event",
    inputs: [
      {
        name: "paymentInfo",
        type: "tuple",
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: "nonce", type: "uint256", indexed: true },
      { name: "submitter", type: "address", indexed: true },
      { name: "role", type: "uint8", indexed: false },
      { name: "cid", type: "string", indexed: false },
      { name: "index", type: "uint256", indexed: false },
    ],
  },
  // ============ Errors ============
  {
    name: "EmptyCid",
    type: "error",
    inputs: [],
  },
  {
    name: "RefundRequestRequired",
    type: "error",
    inputs: [],
  },
  {
    name: "NotPayerReceiverOrArbiter",
    type: "error",
    inputs: [],
  },
  {
    name: "InvalidOperator",
    type: "error",
    inputs: [],
  },
  {
    name: "IndexOutOfBounds",
    type: "error",
    inputs: [],
  },
] as const;

/**
 * Minimal ERC-20 ABI fragment for approve and allowance
 *
 * Used by merchant SDK for managing ReceiverRefundCollector allowances.
 */
export const ERC20ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Export types for ABI consumers
export type PaymentOperatorABIType = typeof PaymentOperatorABI;
export type RefundRequestABIType = typeof RefundRequestABI;
export type IRecorderABIType = typeof IRecorderABI;
export type IFeeCalculatorABIType = typeof IFeeCalculatorABI;
export type EscrowPeriodABIType = typeof EscrowPeriodABI;
export type AuthCaptureEscrowABIType = typeof AuthCaptureEscrowABI;
export type StaticAddressConditionABIType = typeof StaticAddressConditionABI;
export type FreezeABIType = typeof FreezeABI;
export type ProtocolFeeConfigABIType = typeof ProtocolFeeConfigABI;
export type ArbiterRegistryABIType = typeof ArbiterRegistryABI;
export type RefundRequestEvidenceABIType = typeof RefundRequestEvidenceABI;
export type ERC20ABIType = typeof ERC20ABI;
