/**
 * Error handling utilities for X402r SDK
 * @module errors
 */

import { keccak256, toHex, slice } from "viem";

/**
 * All known contract error names in the X402r protocol
 */
export type ContractErrorName =
  // Operator errors
  | "InvalidOperator"
  | "ConditionNotMet"
  | "NotReceiver"
  | "NotPayer"
  // RefundRequest errors
  | "RequestAlreadyExists"
  | "RequestDoesNotExist"
  | "RequestNotPending"
  | "InvalidStatus"
  | "FullyRefunded"
  // EscrowPeriod errors
  | "EscrowPeriodExpired"
  | "AlreadyFrozen"
  | "NotFrozen"
  | "UnauthorizedFreeze";

/**
 * Error definition with selector and human-readable message
 */
export interface ContractErrorDefinition {
  /** Error name */
  name: ContractErrorName;
  /** 4-byte selector (first 4 bytes of keccak256 of error signature) */
  selector: `0x${string}`;
  /** Human-readable error message */
  message: string;
  /** Error signature (e.g., "InvalidOperator()") */
  signature: string;
}

/**
 * Compute error selector from signature
 */
function computeSelector(signature: string): `0x${string}` {
  const hash = keccak256(toHex(signature));
  return slice(hash, 0, 4);
}

/**
 * Create an error definition
 */
function defineError(
  name: ContractErrorName,
  signature: string,
  message: string,
): ContractErrorDefinition {
  return {
    name,
    selector: computeSelector(signature),
    message,
    signature,
  };
}

/**
 * All known contract errors in the X402r protocol
 *
 * @example
 * ```typescript
 * const invalidOp = CONTRACT_ERRORS.InvalidOperator;
 * console.log(invalidOp.selector); // '0x...'
 * console.log(invalidOp.message);  // 'The specified operator is invalid'
 * ```
 */
export const CONTRACT_ERRORS: Record<ContractErrorName, ContractErrorDefinition> = {
  // Operator errors
  InvalidOperator: defineError(
    "InvalidOperator",
    "InvalidOperator()",
    "The specified operator is invalid",
  ),
  ConditionNotMet: defineError(
    "ConditionNotMet",
    "ConditionNotMet()",
    "The condition for this operation was not met",
  ),
  NotReceiver: defineError(
    "NotReceiver",
    "NotReceiver()",
    "Caller is not the receiver of this payment",
  ),
  NotPayer: defineError("NotPayer", "NotPayer()", "Caller is not the payer of this payment"),

  // RefundRequest errors
  RequestAlreadyExists: defineError(
    "RequestAlreadyExists",
    "RequestAlreadyExists()",
    "A refund request already exists for this payment",
  ),
  RequestDoesNotExist: defineError(
    "RequestDoesNotExist",
    "RequestDoesNotExist()",
    "No refund request exists for this payment",
  ),
  RequestNotPending: defineError(
    "RequestNotPending",
    "RequestNotPending()",
    "The refund request is not in pending status",
  ),
  InvalidStatus: defineError(
    "InvalidStatus",
    "InvalidStatus()",
    "Invalid status for this operation",
  ),
  FullyRefunded: defineError(
    "FullyRefunded",
    "FullyRefunded()",
    "This payment has already been fully refunded",
  ),

  // EscrowPeriod errors
  EscrowPeriodExpired: defineError(
    "EscrowPeriodExpired",
    "EscrowPeriodExpired()",
    "The escrow period has expired",
  ),
  AlreadyFrozen: defineError("AlreadyFrozen", "AlreadyFrozen()", "This payment is already frozen"),
  NotFrozen: defineError("NotFrozen", "NotFrozen()", "This payment is not frozen"),
  UnauthorizedFreeze: defineError(
    "UnauthorizedFreeze",
    "UnauthorizedFreeze()",
    "Caller is not authorized to freeze this payment",
  ),
};

// Build selector-to-error lookup map
const selectorMap = new Map<string, ContractErrorDefinition>();
for (const error of Object.values(CONTRACT_ERRORS)) {
  selectorMap.set(error.selector.toLowerCase(), error);
}

/**
 * Custom error class for X402r protocol errors
 *
 * @example
 * ```typescript
 * throw new X402rError('InvalidOperator', 'The operator address is invalid');
 * ```
 */
export class X402rError extends Error {
  /** Error name from ContractErrorName */
  override name: ContractErrorName;
  /** Optional error arguments from contract */
  args?: Record<string, unknown>;

  constructor(name: ContractErrorName, message: string, args?: Record<string, unknown>) {
    super(message);
    this.name = name;
    this.args = args;
    Object.setPrototypeOf(this, X402rError.prototype);
  }
}

/**
 * Error thrown when a method is not yet implemented
 *
 * Used for SDK methods that require future Graph/indexer integration.
 * These methods preserve the API surface for when subgraph support is added.
 *
 * @example
 * ```typescript
 * throw new NotImplementedError(
 *   'getPaymentState',
 *   'This method requires subgraph integration. See: https://docs.x402r.org/indexing'
 * );
 * ```
 */
export class NotImplementedError extends Error {
  /** Name of the method that is not implemented */
  readonly methodName: string;

  constructor(methodName: string, message?: string) {
    const defaultMessage = `Method '${methodName}' is not yet implemented. This method requires The Graph subgraph integration for efficient querying. Track progress at: https://github.com/x402r/x402r-sdk/issues`;
    super(message ?? defaultMessage);
    this.name = "NotImplementedError";
    this.methodName = methodName;
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}

/**
 * Check if an error is a NotImplementedError
 *
 * @param error - The error to check
 * @returns true if the error is a NotImplementedError
 */
export function isNotImplementedError(error: unknown): error is NotImplementedError {
  return error instanceof NotImplementedError;
}

/**
 * Check if an error is an X402rError
 *
 * @param error - The error to check
 * @returns true if the error is an X402rError
 *
 * @example
 * ```typescript
 * try {
 *   await contract.release(...)
 * } catch (e) {
 *   if (isX402rError(e)) {
 *     console.log(e.name, e.message);
 *   }
 * }
 * ```
 */
export function isX402rError(error: unknown): error is X402rError {
  return error instanceof X402rError;
}

/**
 * Decoded contract error result
 */
export interface DecodedContractError {
  /** Error name */
  name: ContractErrorName;
  /** Human-readable error message */
  message: string;
  /** Optional error arguments */
  args?: Record<string, unknown>;
}

/**
 * Decode a contract error from its hex data
 *
 * @param data - Hex-encoded error data (at least 4 bytes for selector)
 * @returns Decoded error or null if unknown
 *
 * @example
 * ```typescript
 * const error = decodeContractError('0x3b7fc7f9');
 * if (error) {
 *   console.log(error.name);    // 'InvalidOperator'
 *   console.log(error.message); // 'The specified operator is invalid'
 * }
 * ```
 */
export function decodeContractError(data: string): DecodedContractError | null {
  if (!data || data === "0x" || data.length < 10) {
    return null;
  }

  // Extract first 4 bytes (selector)
  const selector = data.slice(0, 10).toLowerCase();
  const errorDef = selectorMap.get(selector);

  if (!errorDef) {
    return null;
  }

  return {
    name: errorDef.name,
    message: errorDef.message,
  };
}
