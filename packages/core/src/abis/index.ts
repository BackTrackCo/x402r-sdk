/**
 * Contract ABIs for X402r SDK
 * @module abis
 */

/**
 * PaymentInfo tuple components (reused across ABIs)
 */
const paymentInfoComponents = [
  { name: 'operator', type: 'address' },
  { name: 'payer', type: 'address' },
  { name: 'receiver', type: 'address' },
  { name: 'token', type: 'address' },
  { name: 'maxAmount', type: 'uint120' },
  { name: 'preApprovalExpiry', type: 'uint48' },
  { name: 'authorizationExpiry', type: 'uint48' },
  { name: 'refundExpiry', type: 'uint48' },
  { name: 'minFeeBps', type: 'uint16' },
  { name: 'maxFeeBps', type: 'uint16' },
  { name: 'feeReceiver', type: 'address' },
  { name: 'salt', type: 'uint256' },
] as const;

/**
 * PaymentOperator ABI - Main operator contract for payment flows
 */
export const PaymentOperatorABI = [
  // Functions
  {
    name: 'authorize',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
      { name: 'amount', type: 'uint256' },
      { name: 'tokenCollector', type: 'address' },
      { name: 'collectorData', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'charge',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
      { name: 'amount', type: 'uint256' },
      { name: 'tokenCollector', type: 'address' },
      { name: 'collectorData', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'release',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'refundInEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
      { name: 'amount', type: 'uint120' },
    ],
    outputs: [],
  },
  {
    name: 'refundPostEscrow',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
      { name: 'amount', type: 'uint256' },
      { name: 'tokenCollector', type: 'address' },
      { name: 'collectorData', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'distributeFees',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [],
  },
  {
    name: 'paymentExists',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'paymentInfoHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getPaymentInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'paymentInfoHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'tuple', components: paymentInfoComponents }],
  },
  {
    name: 'isInEscrow',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'paymentInfoHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getPaymentState',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
    ],
    outputs: [{ name: 'state', type: 'uint8' }],
  },
  {
    name: 'getPayerPayments',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'payer', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    name: 'getReceiverPayments',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'receiver', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    name: 'ESCROW',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'FEE_RECIPIENT',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'FEE_CALCULATOR',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'PROTOCOL_FEE_CONFIG',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // Condition slots
  {
    name: 'AUTHORIZE_CONDITION',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'CHARGE_CONDITION',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'RELEASE_CONDITION',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'REFUND_IN_ESCROW_CONDITION',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'REFUND_POST_ESCROW_CONDITION',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // Recorder slots
  {
    name: 'AUTHORIZE_RECORDER',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'CHARGE_RECORDER',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'RELEASE_RECORDER',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'REFUND_IN_ESCROW_RECORDER',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'REFUND_POST_ESCROW_RECORDER',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // Events
  {
    name: 'AuthorizationCreated',
    type: 'event',
    inputs: [
      { name: 'paymentInfoHash', type: 'bytes32', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'receiver', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'ChargeExecuted',
    type: 'event',
    inputs: [
      { name: 'paymentInfoHash', type: 'bytes32', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'receiver', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'ReleaseExecuted',
    type: 'event',
    inputs: [
      {
        name: 'paymentInfo',
        type: 'tuple',
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'RefundInEscrowExecuted',
    type: 'event',
    inputs: [
      {
        name: 'paymentInfo',
        type: 'tuple',
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'RefundPostEscrowExecuted',
    type: 'event',
    inputs: [
      {
        name: 'paymentInfo',
        type: 'tuple',
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'FeesDistributed',
    type: 'event',
    inputs: [
      { name: 'token', type: 'address', indexed: true },
      { name: 'protocolAmount', type: 'uint256', indexed: false },
      { name: 'arbiterAmount', type: 'uint256', indexed: false },
    ],
  },
] as const;

/**
 * RefundRequestData components (reused in ABI)
 */
const refundRequestDataComponents = [
  { name: 'paymentInfoHash', type: 'bytes32' },
  { name: 'nonce', type: 'uint256' },
  { name: 'amount', type: 'uint120' },
  { name: 'status', type: 'uint8' },
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
    name: 'requestRefund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
      { name: 'amount', type: 'uint120' },
      { name: 'nonce', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'updateStatus',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
      { name: 'nonce', type: 'uint256' },
      { name: 'newStatus', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'cancelRefundRequest',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
      { name: 'nonce', type: 'uint256' },
    ],
    outputs: [],
  },
  // ============ View Functions ============
  {
    name: 'getRefundRequest',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
      { name: 'nonce', type: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: refundRequestDataComponents,
      },
    ],
  },
  {
    name: 'hasRefundRequest',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
      { name: 'nonce', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getRefundRequestStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
      { name: 'nonce', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'getRefundRequestByKey',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'compositeKey', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: refundRequestDataComponents,
      },
    ],
  },
  // ============ Paginated Query Functions ============
  {
    name: 'getPayerRefundRequests',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'payer', type: 'address' },
      { name: 'offset', type: 'uint256' },
      { name: 'count', type: 'uint256' },
    ],
    outputs: [
      { name: 'keys', type: 'bytes32[]' },
      { name: 'total', type: 'uint256' },
    ],
  },
  {
    name: 'getReceiverRefundRequests',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'offset', type: 'uint256' },
      { name: 'count', type: 'uint256' },
    ],
    outputs: [
      { name: 'keys', type: 'bytes32[]' },
      { name: 'total', type: 'uint256' },
    ],
  },
  {
    name: 'getPayerRefundRequest',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'payer', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'getReceiverRefundRequest',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  // ============ Count Functions ============
  {
    name: 'payerRefundRequestCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'payer', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'receiverRefundRequestCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'receiver', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // ============ Events ============
  {
    name: 'RefundRequested',
    type: 'event',
    inputs: [
      {
        name: 'paymentInfo',
        type: 'tuple',
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'receiver', type: 'address', indexed: true },
      { name: 'amount', type: 'uint120', indexed: false },
      { name: 'nonce', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'RefundRequestStatusUpdated',
    type: 'event',
    inputs: [
      {
        name: 'paymentInfo',
        type: 'tuple',
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: 'oldStatus', type: 'uint8', indexed: false },
      { name: 'newStatus', type: 'uint8', indexed: false },
      { name: 'updatedBy', type: 'address', indexed: true },
      { name: 'nonce', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'RefundRequestCancelled',
    type: 'event',
    inputs: [
      {
        name: 'paymentInfo',
        type: 'tuple',
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'nonce', type: 'uint256', indexed: false },
    ],
  },
] as const;

/**
 * EscrowPeriod contract ABI
 *
 * EscrowPeriod is a SINGLE contract implementing both IRecorder and ICondition.
 * Use this ABI to read state (getAuthorizationTime, isFrozen, isEscrowPeriodPassed)
 * and call recorder methods (freeze, unfreeze).
 *
 * The same deployed address is used for both authorizeRecorder and releaseCondition
 * in PaymentOperatorConfig.
 */
export const EscrowPeriodABI = [
  // Functions
  {
    name: 'freeze',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
    ],
    outputs: [],
  },
  {
    name: 'unfreeze',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
    ],
    outputs: [],
  },
  {
    name: 'getAuthorizationTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isFrozen',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isEscrowPeriodPassed',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
    ],
    outputs: [
      { name: 'passed', type: 'bool' },
      { name: 'authTime', type: 'uint256' },
    ],
  },
  {
    name: 'ESCROW_PERIOD',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'FREEZE_POLICY',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'authorizationTimes',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'paymentInfoHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'frozenUntil',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'paymentInfoHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Events
  {
    name: 'AuthorizationTimeRecorded',
    type: 'event',
    inputs: [
      {
        name: 'paymentInfo',
        type: 'tuple',
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: 'authorizationTime', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'PaymentFrozen',
    type: 'event',
    inputs: [
      {
        name: 'paymentInfo',
        type: 'tuple',
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: 'caller', type: 'address', indexed: true },
    ],
  },
  {
    name: 'PaymentUnfrozen',
    type: 'event',
    inputs: [
      {
        name: 'paymentInfo',
        type: 'tuple',
        components: paymentInfoComponents,
        indexed: false,
      },
      { name: 'caller', type: 'address', indexed: true },
    ],
  },
] as const;

/**
 * AuthCaptureEscrow ABI - Base escrow contract (subset for SDK needs)
 */
export const AuthCaptureEscrowABI = [
  {
    name: 'getHash',
    type: 'function',
    stateMutability: 'pure',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'paymentState',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'paymentInfoHash', type: 'bytes32' }],
    outputs: [
      { name: 'hasCollectedPayment', type: 'bool' },
      { name: 'capturableAmount', type: 'uint120' },
      { name: 'refundableAmount', type: 'uint120' },
    ],
  },
] as const;

/**
 * StaticAddressCondition ABI - Condition that checks for a specific address
 */
export const StaticAddressConditionABI = [
  {
    name: 'check',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'paymentInfo', type: 'tuple', components: paymentInfoComponents },
      { name: 'caller', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'DESIGNATED_ADDRESS',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// Export types for ABI consumers
export type PaymentOperatorABIType = typeof PaymentOperatorABI;
export type RefundRequestABIType = typeof RefundRequestABI;
export type EscrowPeriodABIType = typeof EscrowPeriodABI;
export type AuthCaptureEscrowABIType = typeof AuthCaptureEscrowABI;
export type StaticAddressConditionABIType = typeof StaticAddressConditionABI;
