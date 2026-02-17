/**
 * Shared payment state operations used by client, merchant, and arbiter packages
 * @module shared/payment-state-operations
 */

import type { PublicClient } from "viem";
import { AuthCaptureEscrowABI } from "../abis/index.js";
import { PaymentState, type PaymentInfo, type PaymentStore } from "../types/index.js";
import { computePaymentInfoHash } from "../utils/index.js";

/** Read-only context for payment state operations */
export interface PaymentStateReadContext {
  publicClient: PublicClient;
  escrowAddress: `0x${string}`;
  chainId: number;
}

/** Context for payment details resolution */
export interface PaymentDetailsContext {
  publicClient: PublicClient;
  escrowAddress: `0x${string}`;
  paymentStore?: PaymentStore;
}

/**
 * Get the current state of a payment by reading the escrow contract.
 *
 * Derives the state from the on-chain escrow amounts and expiry timestamps:
 * - NonExistent: payment has never been authorized
 * - InEscrow: funds are held in escrow (capturableAmount > 0)
 * - Released: funds released to receiver, may still be refundable
 * - Settled: all funds have been moved (capturable = 0, refundable = 0)
 * - Expired: authorization expiry has passed and funds are still in escrow
 *
 * @param ctx - Read context with publicClient, escrowAddress, and chainId
 * @param paymentInfo - The payment information struct
 * @returns The current PaymentState
 */
export async function getPaymentState(
  ctx: PaymentStateReadContext,
  paymentInfo: PaymentInfo,
): Promise<PaymentState> {
  const paymentInfoHash = computePaymentInfoHash(paymentInfo, ctx.escrowAddress, ctx.chainId);

  const state = await ctx.publicClient.readContract({
    address: ctx.escrowAddress,
    abi: AuthCaptureEscrowABI,
    functionName: "paymentState",
    args: [paymentInfoHash],
  });

  const [hasCollectedPayment, capturableAmount, refundableAmount] = state as [
    boolean,
    bigint,
    bigint,
  ];

  if (!hasCollectedPayment) {
    return PaymentState.NonExistent;
  }

  const now = BigInt(Math.floor(Date.now() / 1000));
  if (
    capturableAmount > 0n &&
    paymentInfo.authorizationExpiry > 0n &&
    now > paymentInfo.authorizationExpiry
  ) {
    return PaymentState.Expired;
  }

  if (capturableAmount > 0n) {
    return PaymentState.InEscrow;
  }

  if (refundableAmount > 0n) {
    return PaymentState.Released;
  }

  return PaymentState.Settled;
}

/**
 * Get the full PaymentInfo for a given hash.
 *
 * Resolution strategy:
 * 1. Check local PaymentStore (instant, zero RPC)
 * 2. Scan escrow `PaymentAuthorized` events by hash (1 getLogs call)
 * 3. Cache-fill: save to store if found via events
 *
 * @param ctx - Context with publicClient, escrowAddress, and optional paymentStore
 * @param paymentInfoHash - The hash of the PaymentInfo
 * @param fromBlock - Starting block for event scan fallback (default: earliest)
 * @returns The full PaymentInfo struct
 * @throws Error if PaymentInfo cannot be found in store or events
 */
export async function getPaymentDetails(
  ctx: PaymentDetailsContext,
  paymentInfoHash: `0x${string}`,
  fromBlock?: bigint,
): Promise<PaymentInfo> {
  // 1. Check local store first
  if (ctx.paymentStore) {
    const cached = await ctx.paymentStore.load(paymentInfoHash);
    if (cached) return cached;
  }

  // 2. Fall back to scanning escrow PaymentAuthorized events
  const logs = await ctx.publicClient.getContractEvents({
    address: ctx.escrowAddress,
    abi: AuthCaptureEscrowABI,
    eventName: "PaymentAuthorized",
    args: {
      paymentInfoHash,
    },
    fromBlock: fromBlock ?? "earliest",
  });

  if (logs.length === 0) {
    throw new Error(
      `PaymentInfo not found for hash ${paymentInfoHash}. ` +
        "Payment may not exist or event logs may have been pruned.",
    );
  }

  const eventArgs = logs[0].args as {
    paymentInfo?: {
      operator: `0x${string}`;
      payer: `0x${string}`;
      receiver: `0x${string}`;
      token: `0x${string}`;
      maxAmount: bigint;
      preApprovalExpiry: bigint;
      authorizationExpiry: bigint;
      refundExpiry: bigint;
      minFeeBps: number;
      maxFeeBps: number;
      feeReceiver: `0x${string}`;
      salt: bigint;
    };
  };

  if (!eventArgs.paymentInfo) {
    throw new Error(`PaymentAuthorized event missing paymentInfo for hash ${paymentInfoHash}`);
  }

  const paymentInfo: PaymentInfo = {
    operator: eventArgs.paymentInfo.operator,
    payer: eventArgs.paymentInfo.payer,
    receiver: eventArgs.paymentInfo.receiver,
    token: eventArgs.paymentInfo.token,
    maxAmount: eventArgs.paymentInfo.maxAmount,
    preApprovalExpiry: eventArgs.paymentInfo.preApprovalExpiry,
    authorizationExpiry: eventArgs.paymentInfo.authorizationExpiry,
    refundExpiry: eventArgs.paymentInfo.refundExpiry,
    minFeeBps: Number(eventArgs.paymentInfo.minFeeBps),
    maxFeeBps: Number(eventArgs.paymentInfo.maxFeeBps),
    feeReceiver: eventArgs.paymentInfo.feeReceiver,
    salt: eventArgs.paymentInfo.salt,
  };

  // 3. Cache-fill: save to store for future lookups
  if (ctx.paymentStore) {
    await ctx.paymentStore.save(paymentInfoHash, paymentInfo);
  }

  return paymentInfo;
}
