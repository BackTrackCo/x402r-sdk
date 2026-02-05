/**
 * E2E Dispute Resolution Example
 *
 * Demonstrates the full x402r dispute flow:
 *   Setup → Arbiter Registry → Payment → Dispute → Resolution → Cleanup
 *
 * Requires 3 funded wallets on Base Sepolia (ETH + USDC).
 *
 * Usage:
 *   CLIENT_PRIVATE_KEY=0x... MERCHANT_PRIVATE_KEY=0x... ARBITER_PRIVATE_KEY=0x... pnpm start
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { config as dotenvConfig } from 'dotenv';

import {
  deployMarketplaceOperator,
  getNetworkConfig,
  RequestStatus,
  parsePaymentInfo,
  type PaymentInfo,
} from '@x402r/core';
import { X402rClient } from '@x402r/client';
import { X402rMerchant } from '@x402r/merchant';
import { X402rArbiter } from '@x402r/arbiter';
import { refundable } from '@x402r/helpers';
import {
  createPaymentPayload,
  type PaymentRequirements,
} from '@x402r/evm/escrow/client';
import {
  EscrowFacilitatorScheme,
  createFacilitatorSigner,
  type PaymentPayload,
  type PaymentRequirements as FacilitatorRequirements,
} from '@x402r/evm/escrow/facilitator';

dotenvConfig();

// ============ Configuration ============

const RPC_URL = 'https://sepolia.base.org';
const NETWORK_ID = 'eip155:84532';
const CHAIN_ID = 84532;
const USDC_DECIMALS = 6;
const PAYMENT_AMOUNT = '10000'; // 0.01 USDC

// Short durations for testing
const ESCROW_PERIOD_SECONDS = 60n; // 60 seconds
const FREEZE_DURATION_SECONDS = 120n; // 120 seconds
const OPERATOR_FEE_BPS = 100n; // 1%

const STATUS_NAMES = ['Pending', 'Approved', 'Denied', 'Cancelled'] as const;

// ============ Helpers ============

function formatUSDC(amount: bigint): string {
  const whole = amount / BigInt(10 ** USDC_DECIMALS);
  const fractional = amount % BigInt(10 ** USDC_DECIMALS);
  return `${whole}.${fractional.toString().padStart(USDC_DECIMALS, '0')} USDC`;
}

function shortAddr(address: string): string {
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

function step(phase: string, message: string) {
  console.log(`\n[${phase}] ${message}`);
}

function ok(message: string) {
  console.log(`  OK: ${message}`);
}

function tx(label: string, hash: string) {
  console.log(`  TX: ${label} → ${hash}`);
  txHashes.push({ label, hash });
}

const txHashes: { label: string; hash: string }[] = [];

// ============ Wallet Setup ============

function loadKey(envVar: string): `0x${string}` {
  const key = process.env[envVar] as `0x${string}`;
  if (!key) {
    console.error(`Error: ${envVar} environment variable is required`);
    process.exit(1);
  }
  return key;
}

function makeClients(account: PrivateKeyAccount): {
  publicClient: PublicClient;
  walletClient: WalletClient;
} {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  return { publicClient, walletClient };
}

// ============ Main Flow ============

async function main() {
  console.log('='.repeat(60));
  console.log('  E2E Dispute Resolution — x402r');
  console.log('='.repeat(60));

  // Load accounts
  const clientAccount = privateKeyToAccount(loadKey('CLIENT_PRIVATE_KEY'));
  const merchantAccount = privateKeyToAccount(loadKey('MERCHANT_PRIVATE_KEY'));
  const arbiterAccount = privateKeyToAccount(loadKey('ARBITER_PRIVATE_KEY'));

  const clientClients = makeClients(clientAccount);
  const merchantClients = makeClients(merchantAccount);
  const arbiterClients = makeClients(arbiterAccount);

  const networkConfig = getNetworkConfig(NETWORK_ID)!;

  step('Setup', 'Wallet addresses');
  console.log(`  Client:   ${clientAccount.address}`);
  console.log(`  Merchant: ${merchantAccount.address}`);
  console.log(`  Arbiter:  ${arbiterAccount.address}`);

  // Check balances
  const clientBalance = await clientClients.publicClient.getBalance({ address: clientAccount.address });
  const merchantBalance = await merchantClients.publicClient.getBalance({ address: merchantAccount.address });
  const arbiterBalance = await arbiterClients.publicClient.getBalance({ address: arbiterAccount.address });

  step('Setup', 'ETH balances');
  console.log(`  Client:   ${formatEther(clientBalance)} ETH`);
  console.log(`  Merchant: ${formatEther(merchantBalance)} ETH`);
  console.log(`  Arbiter:  ${formatEther(arbiterBalance)} ETH`);

  if (clientBalance === 0n || merchantBalance === 0n || arbiterBalance === 0n) {
    console.error('\nError: All wallets need ETH for gas. Get testnet ETH from:');
    console.error('https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
    process.exit(1);
  }

  // ============ Phase 0: Deploy Operator ============

  step('Deploy', 'Deploying marketplace operator with short escrow...');
  console.log(`  Escrow period: ${ESCROW_PERIOD_SECONDS}s`);
  console.log(`  Freeze duration: ${FREEZE_DURATION_SECONDS}s`);
  console.log(`  Operator fee: ${Number(OPERATOR_FEE_BPS) / 100}%`);

  const deployResult = await deployMarketplaceOperator(
    merchantClients.walletClient,
    merchantClients.publicClient,
    NETWORK_ID,
    {
      feeRecipient: merchantAccount.address,
      arbiter: arbiterAccount.address,
      escrowPeriodSeconds: ESCROW_PERIOD_SECONDS,
      freezeDurationSeconds: FREEZE_DURATION_SECONDS,
      operatorFeeBps: OPERATOR_FEE_BPS,
    }
  );

  const operatorAddress = deployResult.operatorAddress;
  const freezeAddress = deployResult.freezeAddress;
  const escrowPeriodAddress = deployResult.escrowPeriodAddress;

  ok(`Operator deployed: ${shortAddr(operatorAddress)}`);
  ok(`Freeze contract: ${shortAddr(freezeAddress)}`);
  ok(`EscrowPeriod: ${shortAddr(escrowPeriodAddress)}`);
  console.log(`  New deployments: ${deployResult.summary.newDeployments}`);
  console.log(`  Already existed: ${deployResult.summary.existingContracts}`);

  for (const hash of deployResult.txHashes) {
    tx('deploy', hash);
  }

  // ============ Phase 1: Arbiter Registry ============

  step('Registry', 'Registering arbiter...');

  const arbiter = new X402rArbiter({
    publicClient: arbiterClients.publicClient,
    walletClient: arbiterClients.walletClient,
    operatorAddress,
    escrowAddress: networkConfig.authCaptureEscrow,
    refundRequestAddress: networkConfig.refundRequest,
    arbiterRegistryAddress: networkConfig.arbiterRegistry,
    chainId: CHAIN_ID,
  });

  const registerResult = await arbiter.registerArbiter('https://example.com/arbiter/disputes');
  tx('register-arbiter', registerResult.txHash);
  await arbiterClients.publicClient.waitForTransactionReceipt({ hash: registerResult.txHash });

  const isRegistered = await arbiter.isArbiterRegistered(arbiterAccount.address);
  ok(`Arbiter registered: ${isRegistered}`);

  // ============ Phase 2: Payment via HTTP 402 ============

  step('Payment', 'Starting in-process merchant server...');

  // Build payment requirements
  const baseOption = {
    scheme: 'escrow',
    network: NETWORK_ID,
    payTo: merchantAccount.address as `0x${string}`,
    maxAmountRequired: PAYMENT_AMOUNT,
    asset: networkConfig.usdc,
  };

  const requirements = refundable(baseOption, operatorAddress);

  // Create facilitator for the merchant server
  const facilitatorSigner = createFacilitatorSigner(
    merchantClients.walletClient,
    merchantClients.publicClient
  );
  const facilitator = new EscrowFacilitatorScheme(facilitatorSigner);

  // Start an in-process Hono server
  const app = new Hono();
  let capturedPaymentInfo: PaymentInfo | null = null;

  app.get('/weather', async (c) => {
    const paymentHeader = c.req.header('X-Payment');

    if (!paymentHeader) {
      return c.json({ error: 'Payment Required', accepts: [requirements] }, 402);
    }

    let paymentPayload: PaymentPayload;
    try {
      paymentPayload = JSON.parse(
        Buffer.from(paymentHeader, 'base64').toString('utf-8')
      );
    } catch {
      return c.json({ error: 'Invalid Payment' }, 402);
    }

    const verifyResult = await facilitator.verify(
      paymentPayload,
      requirements as unknown as FacilitatorRequirements
    );
    if (!verifyResult.isValid) {
      return c.json({ error: 'Verification Failed', reason: verifyResult.invalidReason }, 402);
    }

    const settleResult = await facilitator.settle(
      paymentPayload,
      requirements as unknown as FacilitatorRequirements
    );
    if (!settleResult.success) {
      return c.json({ error: 'Settlement Failed', reason: settleResult.errorReason }, 402);
    }

    // Extract PaymentInfo from the payload for later use in dispute
    const payload = paymentPayload.payload as {
      paymentInfo: Record<string, unknown>;
      authorization: { from: string };
    };
    capturedPaymentInfo = {
      operator: payload.paymentInfo.operator as `0x${string}`,
      payer: payload.authorization.from as `0x${string}`,
      receiver: payload.paymentInfo.receiver as `0x${string}`,
      token: payload.paymentInfo.token as `0x${string}`,
      maxAmount: BigInt(String(payload.paymentInfo.maxAmount)),
      preApprovalExpiry: BigInt(String(payload.paymentInfo.preApprovalExpiry)),
      authorizationExpiry: BigInt(String(payload.paymentInfo.authorizationExpiry)),
      refundExpiry: BigInt(String(payload.paymentInfo.refundExpiry)),
      minFeeBps: Number(payload.paymentInfo.minFeeBps),
      maxFeeBps: Number(payload.paymentInfo.maxFeeBps),
      feeReceiver: payload.paymentInfo.feeReceiver as `0x${string}`,
      salt: BigInt(String(payload.paymentInfo.salt)),
    };

    tx('authorize-payment', settleResult.transaction!);

    return c.json({ data: 'Weather: Sunny, 72F', payer: settleResult.payer });
  });

  // Start server on random port
  const server = serve({ fetch: app.fetch, port: 0 });
  const serverAddress = server.address();
  const port = typeof serverAddress === 'object' && serverAddress ? serverAddress.port : 0;
  ok(`Merchant server running on port ${port}`);

  // Client makes a payment
  step('Payment', 'Client requesting weather data (will get 402)...');
  const serverUrl = `http://localhost:${port}`;

  // Step 1: Get 402 response with requirements
  const initialResponse = await fetch(`${serverUrl}/weather`);
  if (initialResponse.status !== 402) {
    console.error(`  Expected 402, got ${initialResponse.status}`);
    process.exit(1);
  }
  const body402 = (await initialResponse.json()) as { accepts: PaymentRequirements[] };
  ok(`Got 402 with ${body402.accepts.length} payment option(s)`);

  // Step 2: Create payment payload
  step('Payment', 'Creating payment payload and signing ERC-3009...');
  const paymentPayload = await createPaymentPayload(
    body402.accepts[0] as PaymentRequirements,
    clientClients.walletClient
  );
  ok('Payment payload created');

  // Step 3: Send payment
  step('Payment', 'Sending payment to merchant...');
  const xPayment = Buffer.from(
    JSON.stringify({ x402Version: 1, scheme: 'escrow', payload: paymentPayload })
  ).toString('base64');

  const paidResponse = await fetch(`${serverUrl}/weather`, {
    headers: { 'X-Payment': xPayment },
  });

  if (paidResponse.status !== 200) {
    const errorBody = await paidResponse.json();
    console.error('  Payment failed:', errorBody);
    process.exit(1);
  }

  const weatherData = await paidResponse.json();
  ok(`Payment accepted! Response: ${JSON.stringify(weatherData)}`);

  // Wait for the authorize tx to be mined
  const authTx = txHashes.find((t) => t.label === 'authorize-payment');
  if (authTx) {
    await clientClients.publicClient.waitForTransactionReceipt({ hash: authTx.hash as `0x${string}` });
  }

  if (!capturedPaymentInfo) {
    console.error('  Error: PaymentInfo was not captured from settlement');
    process.exit(1);
  }

  const paymentInfo = capturedPaymentInfo;
  ok(`PaymentInfo captured — payer: ${shortAddr(paymentInfo.payer)}`);

  // ============ Phase 3: Dispute ============

  step('Dispute', 'Client freezing payment...');

  const client = new X402rClient({
    publicClient: clientClients.publicClient,
    walletClient: clientClients.walletClient,
    operatorAddress,
    escrowAddress: networkConfig.authCaptureEscrow,
    refundRequestAddress: networkConfig.refundRequest,
    chainId: CHAIN_ID,
  });

  const freezeResult = await client.freezePayment(paymentInfo, freezeAddress);
  tx('freeze', freezeResult.txHash);
  await clientClients.publicClient.waitForTransactionReceipt({ hash: freezeResult.txHash });

  const isFrozen = await client.isFrozen(paymentInfo, freezeAddress);
  ok(`Payment frozen: ${isFrozen}`);

  // Verify merchant cannot release while frozen
  step('Dispute', 'Verifying merchant release fails while frozen...');
  const merchant = new X402rMerchant({
    publicClient: merchantClients.publicClient,
    walletClient: merchantClients.walletClient,
    operatorAddress,
    escrowAddress: networkConfig.authCaptureEscrow,
    refundRequestAddress: networkConfig.refundRequest,
    chainId: CHAIN_ID,
  });

  try {
    await merchant.release(paymentInfo, paymentInfo.maxAmount);
    console.error('  Error: Release should have failed while frozen!');
    process.exit(1);
  } catch {
    ok('Merchant release correctly rejected (payment is frozen)');
  }

  // Client requests refund
  step('Dispute', 'Client requesting refund...');
  const refundResult = await client.requestRefund(paymentInfo, paymentInfo.maxAmount, 0n);
  tx('request-refund', refundResult.txHash);
  await clientClients.publicClient.waitForTransactionReceipt({ hash: refundResult.txHash });

  const refundStatus = await client.getRefundStatus(paymentInfo, 0n);
  ok(`Refund status: ${STATUS_NAMES[refundStatus]}`);

  // ============ Phase 4: Resolution ============

  step('Resolution', 'Arbiter listing pending requests...');

  const { keys, total } = await arbiter.getPendingRefundRequests(
    0n,
    10n,
    merchantAccount.address
  );
  ok(`Found ${total} refund request(s), ${keys.length} key(s) returned`);

  if (keys.length === 0) {
    console.error('  Error: No refund requests found');
    process.exit(1);
  }

  const targetKey = keys[0];
  console.log(`  Target key: ${targetKey}`);

  // Arbiter approves
  step('Resolution', 'Arbiter approving refund...');
  const approveResult = await arbiter.approveRefundRequest(paymentInfo, 0n);
  tx('approve-refund', approveResult.txHash);
  await arbiterClients.publicClient.waitForTransactionReceipt({ hash: approveResult.txHash });

  const statusAfterApprove = await arbiter.getRefundStatus(paymentInfo, 0n);
  ok(`Refund status after approve: ${STATUS_NAMES[statusAfterApprove]}`);

  // Arbiter executes refund
  step('Resolution', 'Arbiter executing refund (refundInEscrow)...');

  // Check client USDC balance before refund
  const usdcBalanceBefore = await clientClients.publicClient.readContract({
    address: networkConfig.usdc,
    abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }],
    functionName: 'balanceOf',
    args: [clientAccount.address],
  }) as bigint;

  const executeResult = await arbiter.executeRefundInEscrow(paymentInfo);
  tx('execute-refund', executeResult.txHash);
  await arbiterClients.publicClient.waitForTransactionReceipt({ hash: executeResult.txHash });

  // Check client USDC balance after refund
  const usdcBalanceAfter = await clientClients.publicClient.readContract({
    address: networkConfig.usdc,
    abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }],
    functionName: 'balanceOf',
    args: [clientAccount.address],
  }) as bigint;

  const refunded = usdcBalanceAfter - usdcBalanceBefore;
  ok(`Client USDC refunded: ${formatUSDC(refunded)}`);
  ok(`Client USDC balance: ${formatUSDC(usdcBalanceAfter)}`);

  // ============ Phase 5: Cleanup ============

  step('Cleanup', 'Arbiter deregistering from registry...');
  const deregisterResult = await arbiter.deregisterArbiter();
  tx('deregister-arbiter', deregisterResult.txHash);
  await arbiterClients.publicClient.waitForTransactionReceipt({ hash: deregisterResult.txHash });

  const isStillRegistered = await arbiter.isArbiterRegistered(arbiterAccount.address);
  ok(`Arbiter still registered: ${isStillRegistered}`);

  // ============ Summary ============

  console.log('\n' + '='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));

  console.log('\nDeployed Contracts:');
  console.log(`  Operator:     ${operatorAddress}`);
  console.log(`  Freeze:       ${freezeAddress}`);
  console.log(`  EscrowPeriod: ${escrowPeriodAddress}`);

  console.log('\nTransaction Hashes:');
  for (const { label, hash } of txHashes) {
    console.log(`  ${label.padEnd(20)} ${hash}`);
    console.log(`  ${''.padEnd(20)} https://sepolia.basescan.org/tx/${hash}`);
  }

  console.log('\nResult: Dispute resolved — client refunded');
  console.log('='.repeat(60));

  // Shutdown server
  server.close();
}

main().catch((error) => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
