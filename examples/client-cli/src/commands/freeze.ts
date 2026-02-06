/**
 * Freeze Command
 * Freezes a payment to extend the escrow period
 */

import { X402rClient } from "@x402r/client";
import type { PaymentInfo } from "@x402r/core";
import type { PublicClient, WalletClient } from "viem";

export interface FreezeOptions {
  paymentInfo: PaymentInfo;
  freezeAddress: `0x${string}`;
  operatorAddress: `0x${string}`;
  publicClient: PublicClient;
  walletClient: WalletClient;
}

export interface FreezeResult {
  success: boolean;
  txHash?: `0x${string}`;
  error?: string;
}

/**
 * Freeze a payment
 */
export async function freeze(options: FreezeOptions): Promise<FreezeResult> {
  const {
    paymentInfo,
    freezeAddress,
    operatorAddress,
    publicClient,
    walletClient,
  } = options;

  console.log("\nFreezing payment...");
  console.log("  Operator:", operatorAddress);
  console.log("  Freeze Contract:", freezeAddress);
  console.log("  Payer:", paymentInfo.payer);
  console.log("  Receiver:", paymentInfo.receiver);

  // Create client
  const client = new X402rClient({
    publicClient,
    walletClient,
    operatorAddress,
  });

  // Check if already frozen
  const isFrozen = await client.isFrozen(paymentInfo, freezeAddress);
  if (isFrozen) {
    console.log("\nPayment is already frozen");
    return {
      success: true,
    };
  }

  try {
    // Freeze the payment
    const { txHash } = await client.freezePayment(paymentInfo, freezeAddress);
    console.log("\nPayment frozen!");
    console.log("  Transaction:", txHash);

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("\nFreeze failed:", message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Unfreeze a payment
 */
export async function unfreeze(options: FreezeOptions): Promise<FreezeResult> {
  const {
    paymentInfo,
    freezeAddress,
    operatorAddress,
    publicClient,
    walletClient,
  } = options;

  console.log("\nUnfreezing payment...");
  console.log("  Operator:", operatorAddress);
  console.log("  Freeze Contract:", freezeAddress);

  // Create client
  const client = new X402rClient({
    publicClient,
    walletClient,
    operatorAddress,
  });

  // Check if frozen
  const isFrozen = await client.isFrozen(paymentInfo, freezeAddress);
  if (!isFrozen) {
    console.log("\nPayment is not frozen");
    return {
      success: true,
    };
  }

  try {
    // Unfreeze the payment
    const { txHash } = await client.unfreezePayment(paymentInfo, freezeAddress);
    console.log("\nPayment unfrozen!");
    console.log("  Transaction:", txHash);

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("\nUnfreeze failed:", message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Check if a payment is frozen
 */
export async function checkFrozen(
  options: Omit<FreezeOptions, "walletClient">,
): Promise<boolean> {
  const { paymentInfo, freezeAddress, operatorAddress, publicClient } = options;

  const client = new X402rClient({
    publicClient,
    operatorAddress,
  });

  return client.isFrozen(paymentInfo, freezeAddress);
}
