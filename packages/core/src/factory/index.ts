/**
 * Factory utilities for X402r SDK
 * @module factory
 */

/**
 * Zero address constant
 */
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// ============ Config Types ============

/**
 * Configuration for deploying a PaymentOperator via the factory
 *
 * @example
 * ```typescript
 * const config: PaymentOperatorConfig = {
 *   feeRecipient: '0x...',
 *   feeCalculator: '0x0000000000000000000000000000000000000000', // No operator fee
 *   authorizeCondition: '0x0000000000000000000000000000000000000000',
 *   // ... other fields default to zero address
 * };
 * ```
 */
export interface PaymentOperatorConfig {
  /** Address to receive operator fees */
  feeRecipient: `0x${string}`;
  /** Fee calculator contract (address(0) = no operator fee) */
  feeCalculator: `0x${string}`;
  /** Condition to check before authorize (address(0) = always allow) */
  authorizeCondition: `0x${string}`;
  /** Recorder to call after authorize (address(0) = no-op) */
  authorizeRecorder: `0x${string}`;
  /** Condition to check before charge (address(0) = always allow) */
  chargeCondition: `0x${string}`;
  /** Recorder to call after charge (address(0) = no-op) */
  chargeRecorder: `0x${string}`;
  /** Condition to check before release (address(0) = always allow) */
  releaseCondition: `0x${string}`;
  /** Recorder to call after release (address(0) = no-op) */
  releaseRecorder: `0x${string}`;
  /** Condition to check before refundInEscrow (address(0) = always allow) */
  refundInEscrowCondition: `0x${string}`;
  /** Recorder to call after refundInEscrow (address(0) = no-op) */
  refundInEscrowRecorder: `0x${string}`;
  /** Condition to check before refundPostEscrow (address(0) = always allow) */
  refundPostEscrowCondition: `0x${string}`;
  /** Recorder to call after refundPostEscrow (address(0) = no-op) */
  refundPostEscrowRecorder: `0x${string}`;
}

/**
 * Partial config input for creating PaymentOperatorConfig
 * Only feeRecipient is required; all conditions/recorders default to zero address
 */
export interface PaymentOperatorConfigInput {
  feeRecipient: `0x${string}`;
  feeCalculator?: `0x${string}`;
  authorizeCondition?: `0x${string}`;
  authorizeRecorder?: `0x${string}`;
  chargeCondition?: `0x${string}`;
  chargeRecorder?: `0x${string}`;
  releaseCondition?: `0x${string}`;
  releaseRecorder?: `0x${string}`;
  refundInEscrowCondition?: `0x${string}`;
  refundInEscrowRecorder?: `0x${string}`;
  refundPostEscrowCondition?: `0x${string}`;
  refundPostEscrowRecorder?: `0x${string}`;
}

/**
 * Create a PaymentOperatorConfig with defaults for missing fields
 *
 * @param input - Partial config with required feeRecipient
 * @returns Full PaymentOperatorConfig with zero addresses for unspecified fields
 *
 * @example
 * ```typescript
 * // EscrowPeriod is ONE contract - use same address for recorder AND condition
 * const config = createPaymentOperatorConfig({
 *   feeRecipient: '0x1234...',
 *   authorizeRecorder: escrowPeriodAddress,  // Records authorization timestamp
 *   releaseCondition: escrowPeriodAddress,   // Checks if escrow period passed
 * });
 * ```
 */
export function createPaymentOperatorConfig(
  input: PaymentOperatorConfigInput,
): PaymentOperatorConfig {
  return {
    feeRecipient: input.feeRecipient,
    feeCalculator: input.feeCalculator ?? ZERO_ADDRESS,
    authorizeCondition: input.authorizeCondition ?? ZERO_ADDRESS,
    authorizeRecorder: input.authorizeRecorder ?? ZERO_ADDRESS,
    chargeCondition: input.chargeCondition ?? ZERO_ADDRESS,
    chargeRecorder: input.chargeRecorder ?? ZERO_ADDRESS,
    releaseCondition: input.releaseCondition ?? ZERO_ADDRESS,
    releaseRecorder: input.releaseRecorder ?? ZERO_ADDRESS,
    refundInEscrowCondition: input.refundInEscrowCondition ?? ZERO_ADDRESS,
    refundInEscrowRecorder: input.refundInEscrowRecorder ?? ZERO_ADDRESS,
    refundPostEscrowCondition: input.refundPostEscrowCondition ?? ZERO_ADDRESS,
    refundPostEscrowRecorder: input.refundPostEscrowRecorder ?? ZERO_ADDRESS,
  };
}

/**
 * Zero bytes32 constant for authorizedCodehash (allows any operator)
 */
export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

/**
 * Configuration for deploying an EscrowPeriod contract
 *
 * @remarks
 * EscrowPeriod is a single contract that implements BOTH IRecorder and ICondition.
 * It records authorization timestamps and checks if the escrow period has passed.
 */
export interface EscrowPeriodConfig {
  /** Duration of the escrow period in seconds */
  escrowPeriod: bigint;
  /** Runtime codehash of authorized caller (bytes32(0) = any operator can record) */
  authorizedCodehash: `0x${string}`;
}

/**
 * Partial config input for creating EscrowPeriodConfig
 */
export interface EscrowPeriodConfigInput {
  escrowPeriod: bigint;
  /** Runtime codehash of authorized caller (defaults to bytes32(0) = any operator) */
  authorizedCodehash?: `0x${string}`;
}

/**
 * Create an EscrowPeriodConfig with defaults for missing fields
 *
 * @param input - Partial config with required escrowPeriod
 * @returns Full EscrowPeriodConfig
 *
 * @example
 * ```typescript
 * // 7 day escrow period, any operator can record
 * const config = createEscrowPeriodConfig({
 *   escrowPeriod: 604800n,
 * });
 * ```
 */
export function createEscrowPeriodConfig(input: EscrowPeriodConfigInput): EscrowPeriodConfig {
  return {
    escrowPeriod: input.escrowPeriod,
    authorizedCodehash: input.authorizedCodehash ?? ZERO_BYTES32,
  };
}

/**
 * Configuration for deploying a Freeze contract via FreezeFactory
 */
export interface FreezeConfig {
  /** Condition that authorizes freeze calls */
  freezeCondition: `0x${string}`;
  /** Condition that authorizes unfreeze calls */
  unfreezeCondition: `0x${string}`;
  /** Duration that freezes last (0 = permanent) */
  freezeDuration: bigint;
  /** EscrowPeriod contract address (address(0) = no escrow period integration) */
  escrowPeriodContract: `0x${string}`;
}

/**
 * Partial config input for creating FreezeConfig
 */
export interface FreezeConfigInput {
  freezeCondition: `0x${string}`;
  unfreezeCondition: `0x${string}`;
  freezeDuration?: bigint;
  escrowPeriodContract?: `0x${string}`;
}

/**
 * Create a FreezeConfig with defaults for missing fields
 *
 * @param input - Partial config with required freeze/unfreeze conditions
 * @returns Full FreezeConfig
 *
 * @example
 * ```typescript
 * // Payer can freeze/unfreeze with 3 day limit
 * const config = createFreezeConfig({
 *   freezeCondition: payerConditionAddress,
 *   unfreezeCondition: payerConditionAddress,
 *   freezeDuration: 259200n, // 3 days
 *   escrowPeriodContract: escrowPeriodAddress,
 * });
 * ```
 */
export function createFreezeConfig(input: FreezeConfigInput): FreezeConfig {
  return {
    freezeCondition: input.freezeCondition,
    unfreezeCondition: input.unfreezeCondition,
    freezeDuration: input.freezeDuration ?? 0n,
    escrowPeriodContract: input.escrowPeriodContract ?? ZERO_ADDRESS,
  };
}
