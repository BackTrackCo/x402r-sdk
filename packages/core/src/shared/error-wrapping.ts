/**
 * Contract write error wrapping utility
 * @module shared/error-wrapping
 */

import { BaseError, ContractFunctionRevertedError } from "viem";
import { X402rError } from "../errors/index.js";
import { decodeContractError } from "../errors/index.js";

/**
 * Wraps a contract write operation with structured error decoding.
 *
 * Error decoding tiers:
 * 1. Known contract revert: decoded via `decodeContractError()` -> X402rError with specific ContractErrorName
 * 2. Unknown revert: selector not recognized -> X402rError("ContractCallFailed") with raw data
 * 3. Non-revert viem error (gas, network): X402rError("ContractCallFailed") with shortMessage
 * 4. Non-viem error: re-thrown as-is
 *
 * @param opName - Operation name for error context (e.g., "release", "requestRefund")
 * @param fn - The async function to execute
 * @returns The result of fn()
 * @throws {X402rError} for contract and viem errors
 */
export async function wrapContractWrite<T>(opName: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Tier 4: Non-viem errors pass through
    if (!(error instanceof BaseError)) {
      throw error;
    }

    // Walk the error cause chain looking for a ContractFunctionRevertedError
    const revertError = error.walk(
      e => e instanceof ContractFunctionRevertedError,
    ) as ContractFunctionRevertedError | null;

    if (revertError) {
      // Extract raw revert data from the error
      const raw = revertError.raw;

      if (raw) {
        // Tier 1: Try to decode as a known contract error
        const decoded = decodeContractError(raw);
        if (decoded) {
          throw new X402rError(decoded.name, `${opName}: ${decoded.message}`, {
            operation: opName,
            ...(decoded.args ?? {}),
          });
        }

        // Tier 2: Unknown revert selector
        throw new X402rError(
          "ContractCallFailed",
          `${opName}: contract reverted with unknown error`,
          { operation: opName, raw },
        );
      }

      // Revert without raw data
      throw new X402rError(
        "ContractCallFailed",
        `${opName}: contract reverted: ${revertError.shortMessage}`,
        { operation: opName },
      );
    }

    // Tier 3: Non-revert viem error (gas estimation, network, etc.)
    throw new X402rError("ContractCallFailed", `${opName}: ${error.shortMessage}`, {
      operation: opName,
    });
  }
}
