/**
 * Pay Command
 * Fetches 402 requirements, creates payment payload, and makes payment
 */

import { createPaymentPayload } from '@x402r/evm/escrow/client';
import type { WalletClient } from 'viem';

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

  // Parse 402 response
  const paymentRequired = await initialResponse.json();
  console.log('\nReceived 402 Payment Required');

  if (!paymentRequired.accepts || paymentRequired.accepts.length === 0) {
    return {
      success: false,
      error: 'No payment options in 402 response',
    };
  }

  // Use first payment option (escrow scheme)
  const requirements = paymentRequired.accepts[0];
  console.log('\nPayment Requirements:');
  console.log('  Scheme:', requirements.scheme);
  console.log('  Network:', requirements.network);
  console.log('  Amount:', requirements.maxAmountRequired, 'units');
  console.log('  Pay To:', requirements.payTo);
  console.log('  Operator:', requirements.extra?.operatorAddress);

  // Step 2: Create payment payload
  console.log('\nCreating payment payload...');
  const paymentPayload = await createPaymentPayload(requirements, walletClient);

  console.log('  Payer:', paymentPayload.authorization.from);
  console.log('  Value:', paymentPayload.authorization.value);
  console.log('  Salt:', paymentPayload.paymentInfo.salt);

  // Encode as base64 for X-Payment header
  const x402Payload = {
    x402Version: 1,
    scheme: requirements.scheme,
    payload: paymentPayload,
  };
  const paymentHeader = Buffer.from(JSON.stringify(x402Payload)).toString('base64');

  // Step 3: Make paid request
  console.log('\nSending payment to server...');
  const paidResponse = await fetch(url, {
    headers: {
      'X-Payment': paymentHeader,
    },
  });

  if (!paidResponse.ok) {
    const error = await paidResponse.json().catch(() => ({ message: 'Unknown error' }));
    return {
      success: false,
      error: `Payment failed: ${error.message || error.error || paidResponse.statusText}`,
      paymentInfo: paymentPayload.paymentInfo,
    };
  }

  const response = await paidResponse.json();
  console.log('\nPayment successful!');

  return {
    success: true,
    response,
    paymentInfo: paymentPayload.paymentInfo,
    transaction: response.payment?.transaction,
  };
}
