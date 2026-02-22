/**
 * Shared freeze operations used by client, merchant, and arbiter packages
 * @module shared/freeze-operations
 */

import type { PublicClient } from "viem";
import { freezeAbi } from "../abis/index.js";
import type { PaymentInfo, FreezeEventLog } from "../types/index.js";
import { toAbiPaymentInfo } from "../utils/index.js";

/** Read-only context for freeze operations */
export interface FreezeReadContext {
  publicClient: PublicClient;
}

/**
 * Check if a payment is currently frozen
 *
 * @param ctx - Read context with publicClient
 * @param paymentInfo - The payment information struct
 * @param freezeAddress - The Freeze contract address
 * @returns True if payment is frozen
 */
export async function isFrozen(
  ctx: FreezeReadContext,
  paymentInfo: PaymentInfo,
  freezeAddress: `0x${string}`,
): Promise<boolean> {
  const frozen = await ctx.publicClient.readContract({
    address: freezeAddress,
    abi: freezeAbi,
    functionName: "isFrozen",
    args: [toAbiPaymentInfo(paymentInfo)],
  });

  return frozen as boolean;
}

/**
 * Watch for freeze and unfreeze events
 *
 * @param ctx - Read context with publicClient
 * @param freezeAddress - The Freeze contract address
 * @param callback - Callback function called on freeze events
 * @returns Object with unsubscribe function
 */
export function watchFreezeEvents(
  ctx: FreezeReadContext,
  freezeAddress: `0x${string}`,
  callback: (event: FreezeEventLog) => void,
): { unsubscribe: () => void } {
  const unsubscribeFrozen = ctx.publicClient.watchContractEvent({
    address: freezeAddress,
    abi: freezeAbi,
    eventName: "PaymentFrozen",
    onLogs: logs => {
      for (const log of logs) {
        callback(log as unknown as FreezeEventLog);
      }
    },
  });

  const unsubscribeUnfrozen = ctx.publicClient.watchContractEvent({
    address: freezeAddress,
    abi: freezeAbi,
    eventName: "PaymentUnfrozen",
    onLogs: logs => {
      for (const log of logs) {
        callback(log as unknown as FreezeEventLog);
      }
    },
  });

  return {
    unsubscribe: () => {
      unsubscribeFrozen();
      unsubscribeUnfrozen();
    },
  };
}
