/**
 * Pay Command
 * Fetches 402 requirements, creates payment payload, and makes payment.
 *
 * Uses x402 v2 protocol (Payment-Signature header, amount field).
 */

import { createPaymentPayload } from "@x402r/evm/escrow/client";
import type { WalletClient } from "viem";

export interface PayOptions {
  url: string;
  walletClient: WalletClient;
}

export interface PayResult {
  success: boolean;
  response?: unknown;
  paymentInfo?: unknown;
  transaction?: string;
  error?: string;
}

/**
 * Execute a paid request to a URL
 */
export async function pay(options: PayOptions): Promise<PayResult> {
  const { url, walletClient } = options;

  console.log(`\nFetching payment requirements from ${url}...`);

  // Step 1: Fetch the URL to get 402 response with requirements
  const initialResponse = await fetch(url);

  // If not 402, the endpoint doesn't require payment
  if (initialResponse.status !== 402) {
    if (initialResponse.ok) {
      const data = await initialResponse.json();
      return {
        success: true,
        response: data,
      };
    }
    return {
      success: false,
      error: `Unexpected status: ${initialResponse.status}`,
    };
  }

  // Parse 402 response from payment-required header (x402 v2)
  const paymentRequiredHeader = initialResponse.headers.get("payment-required");
  if (!paymentRequiredHeader) {
    return {
      success: false,
      error: "Missing payment-required header in 402 response",
    };
  }

  const paymentRequired: Record<string, unknown> = JSON.parse(
    Buffer.from(paymentRequiredHeader, "base64").toString(),
  );

  console.log("\nReceived 402 Payment Required");

  if (!paymentRequired.accepts || !(paymentRequired.accepts as unknown[]).length) {
    return {
      success: false,
      error: "No payment options in 402 response",
    };
  }

  // Use first payment option (escrow scheme)
  const requirements = (paymentRequired.accepts as Record<string, unknown>[])[0];

  console.log("\nPayment Requirements:");
  console.log("  Scheme:", requirements.scheme);
  console.log("  Network:", requirements.network);
  console.log("  Amount:", requirements.amount, "units");
  console.log("  Pay To:", requirements.payTo);
  console.log("  Operator:", (requirements.extra as Record<string, unknown>)?.operatorAddress);

  // Step 2: Create payment payload
  console.log("\nCreating payment payload...");
  const escrowPayload = await createPaymentPayload(requirements, walletClient);

  console.log("  Payer:", escrowPayload.authorization.from);
  console.log("  Value:", escrowPayload.authorization.value);
  console.log("  Salt:", escrowPayload.paymentInfo.salt);

  // Step 3: Build payment header and make paid request (x402 v2)
  const x402Payload = {
    x402Version: 2,
    resource: paymentRequired.resource,
    accepted: requirements,
    payload: escrowPayload,
  };
  const paymentHeader = Buffer.from(JSON.stringify(x402Payload)).toString("base64");

  console.log("\nSending payment to server...");
  const paidResponse = await fetch(url, {
    headers: {
      "Payment-Signature": paymentHeader,
    },
  });

  // Build complete paymentInfo with payer field included
  const completePaymentInfo = {
    ...escrowPayload.paymentInfo,
    payer: escrowPayload.authorization.from,
  };

  if (!paidResponse.ok) {
    const error = await paidResponse.json().catch(() => ({ message: "Unknown error" }));
    return {
      success: false,
      error: `Payment failed: ${error.message || error.error || paidResponse.statusText}`,
      paymentInfo: completePaymentInfo,
    };
  }

  const response = await paidResponse.json();
  console.log("\nPayment successful!");

  const transaction = response.payment?.transaction;

  return {
    success: true,
    response,
    paymentInfo: completePaymentInfo,
    transaction,
  };
}
