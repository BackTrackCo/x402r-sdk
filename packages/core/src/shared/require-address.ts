/**
 * Shared address assertion utility
 * @module shared/require-address
 */

import { X402rError } from "../errors/index.js";

/**
 * Asserts that an address is defined.
 * Throws an X402rError with "MissingAddress" code if the address is undefined.
 *
 * @param address - The address to check
 * @param name - Human-readable name of the address (e.g., "escrow", "refundRequest")
 */
export function requireAddress(
  address: `0x${string}` | undefined,
  name: string,
): asserts address is `0x${string}` {
  if (!address) {
    throw new X402rError(
      "MissingAddress",
      `${name} address required. Use resolveAddresses(networkId) from @x402r/core to get the address for your network.`,
      { addressName: name },
    );
  }
}
