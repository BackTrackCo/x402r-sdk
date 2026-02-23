/**
 * Shared refund budget operations (ReceiverRefundCollector + post-escrow refund)
 *
 * These operations are not role-specific: any actor (merchant, arbiter, platform)
 * can execute them if the operator's REFUND_POST_ESCROW_CONDITION allows it.
 *
 * @module shared/refund-budget-operations
 */

import { erc20Abi, type PublicClient, type WalletClient } from "viem";
import { paymentOperatorAbi } from "../abis/index.js";
import type { PaymentInfo } from "../types/index.js";
import { toAbiPaymentInfo } from "../utils/index.js";
import { requireAccount } from "./require-account.js";

/** Read-only context for checking refund budgets (ERC-20 allowance reads) */
export interface RefundBudgetReadContext {
  publicClient: PublicClient;
  receiverRefundCollectorAddress: `0x${string}`;
}

/** Read-write context for approving refund budgets (ERC-20 approve) */
export interface RefundBudgetWriteContext extends RefundBudgetReadContext {
  walletClient: WalletClient;
}

/** Write context for calling operator functions (refundPostEscrow) */
export interface OperatorWriteContext {
  publicClient: PublicClient;
  walletClient: WalletClient;
  operatorAddress: `0x${string}`;
}

/**
 * Get the remaining refund budget (ERC-20 allowance) for the ReceiverRefundCollector
 *
 * @param ctx - Read context with publicClient and receiverRefundCollectorAddress
 * @param tokenAddress - ERC-20 token contract address
 * @param ownerAddress - The address whose allowance to check
 * @returns Remaining allowance in token units
 */
export async function getRefundBudget(
  ctx: RefundBudgetReadContext,
  tokenAddress: `0x${string}`,
  ownerAddress: `0x${string}`,
): Promise<bigint> {
  const allowance = await ctx.publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [ownerAddress, ctx.receiverRefundCollectorAddress],
  });

  return allowance as bigint;
}

/**
 * Approve a refund budget by setting an ERC-20 allowance on the ReceiverRefundCollector
 *
 * The caller calls `token.approve(receiverRefundCollector, amount)` to pre-authorize
 * a refund budget. Post-escrow refunds can then be processed without per-refund signatures.
 *
 * @param ctx - Write context with publicClient, walletClient, and receiverRefundCollectorAddress
 * @param tokenAddress - ERC-20 token contract address
 * @param amount - Amount to approve as refund budget (in token units)
 * @returns Transaction hash
 */
export async function approveRefundBudget(
  ctx: RefundBudgetWriteContext,
  tokenAddress: `0x${string}`,
  amount: bigint,
): Promise<{ txHash: `0x${string}` }> {
  requireAccount(ctx.walletClient);

  const txHash = await ctx.walletClient.writeContract({
    chain: ctx.walletClient.chain,
    account: ctx.walletClient.account,
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [ctx.receiverRefundCollectorAddress, amount],
  });

  return { txHash: txHash as `0x${string}` };
}

/**
 * Execute a post-escrow refund via the operator
 *
 * Calls `operator.refundPostEscrow()` with a generic token collector.
 * This operation is gated by the operator's REFUND_POST_ESCROW_CONDITION,
 * not by caller role.
 *
 * @param ctx - Write context with publicClient, walletClient, and operatorAddress
 * @param paymentInfo - The payment information struct
 * @param amount - Amount to refund in token units
 * @param tokenCollector - Address of the token collector contract that will source the refund
 * @param collectorData - Data to pass to the token collector (e.g., signatures)
 * @returns Transaction hash
 */
export async function refundPostEscrow(
  ctx: OperatorWriteContext,
  paymentInfo: PaymentInfo,
  amount: bigint,
  tokenCollector: `0x${string}`,
  collectorData: `0x${string}`,
): Promise<{ txHash: `0x${string}` }> {
  requireAccount(ctx.walletClient);

  const txHash = await ctx.walletClient.writeContract({
    chain: ctx.walletClient.chain,
    account: ctx.walletClient.account,
    address: ctx.operatorAddress,
    abi: paymentOperatorAbi,
    functionName: "refundPostEscrow",
    args: [toAbiPaymentInfo(paymentInfo), amount, tokenCollector, collectorData],
  });

  return { txHash: txHash as `0x${string}` };
}

/**
 * Execute a post-escrow refund using the ReceiverRefundCollector
 *
 * Convenience wrapper that calls `refundPostEscrow()` with the default
 * ReceiverRefundCollector address and empty collector data.
 * Requires a prior `approveRefundBudget()` call with sufficient allowance.
 *
 * @param ctx - Write context with operator and receiverRefundCollector addresses
 * @param paymentInfo - The payment information struct
 * @param amount - Amount to refund in token units
 * @returns Transaction hash
 */
export async function refundPostEscrowFromBudget(
  ctx: OperatorWriteContext & { receiverRefundCollectorAddress: `0x${string}` },
  paymentInfo: PaymentInfo,
  amount: bigint,
): Promise<{ txHash: `0x${string}` }> {
  return refundPostEscrow(ctx, paymentInfo, amount, ctx.receiverRefundCollectorAddress, "0x");
}
