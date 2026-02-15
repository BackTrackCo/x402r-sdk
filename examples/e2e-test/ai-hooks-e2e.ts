/**
 * E2E Integration Test: AI Hooks Pipeline on Base Sepolia
 *
 * Tests the `createWebhookHandler` pipeline against real contracts:
 *   Authorize → Request Refund → Submit Evidence (payer + merchant) →
 *   AI Hook Evaluation → Auto-Submit Decision → Execute Refund
 *
 * The LLM call is replaced by a simple rule-based hook — everything else
 * (evidence fetch, decision submission, refund execution) is real on-chain.
 *
 * Uses 3 accounts derived from a single mnemonic (or separate private keys):
 *   - Account 0: Payer (has ETH + USDC)
 *   - Account 1: Merchant/Receiver
 *   - Account 2: Arbiter
 *
 * Prerequisites:
 *   - Base Sepolia ETH (~0.01 for gas)
 *   - Base Sepolia USDC (0.01 USDC = 10000 units)
 *
 * Usage:
 *   PRIVATE_KEY=0x... pnpm example:e2e-ai-hooks
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  formatUnits,
  type Address,
  type PublicClient,
  erc20Abi,
} from "viem";
import { baseSepolia } from "viem/chains";
import { mnemonicToAccount, privateKeyToAccount, generateMnemonic } from "viem/accounts";
import { english } from "viem/accounts";
import {
  deployMarketplaceOperator,
  getNetworkConfig,
  resolveAddresses,
  toAbiPaymentInfo,
  computeEscrowNonce,
  signERC3009Authorization,
  computePaymentInfoHash,
  PaymentOperatorABI,
  AuthCaptureEscrowABI,
  RequestStatus,
  type PaymentInfo,
} from "../../packages/core/dist/index.js";
import { X402rClient } from "../../packages/client/dist/index.js";
import { X402rArbiter } from "../../packages/arbiter/dist/index.js";
import { X402rMerchant } from "../../packages/merchant/dist/index.js";
import {
  createWebhookHandler,
  type CaseEvaluationContext,
} from "../../packages/arbiter/dist/index.js";

// ============ Configuration ============

const NETWORK_ID = process.env.NETWORK_ID ?? "eip155:84532";
const RPC_URL = process.env.RPC_URL ?? "https://sepolia.base.org";
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;
const PAYMENT_AMOUNT = 10000n; // 0.01 USDC (6 decimals)
const GAS_FUNDING = 10000000000000n; // 0.00001 ETH per derived account

// ============ Helpers ============

const SCANNER = "https://sepolia.basescan.org";

interface StepResult {
  name: string;
  pass: boolean;
  txHash?: string;
  error?: string;
}

const results: StepResult[] = [];

function log(msg: string) {
  console.log(`  ${msg}`);
}

function step(name: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`STEP: ${name}`);
  console.log("=".repeat(60));
}

function pass(name: string, txHash?: string) {
  console.log(`  PASS: ${name}`);
  if (txHash) console.log(`    tx: ${SCANNER}/tx/${txHash}`);
  results.push({ name, pass: true, txHash });
}

function fail(name: string, error: string) {
  console.log(`  FAIL: ${name}`);
  console.log(`    error: ${error}`);
  results.push({ name, pass: false, error });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForTx(publicClient: PublicClient, hash: `0x${string}`) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
  if (receipt.status !== "success") {
    throw new Error(`Transaction reverted: ${hash}`);
  }
  await sleep(2000);
  return receipt;
}

// ============ Main ============

async function main() {
  console.log("==============================================================");
  console.log("    x402r AI Hooks E2E Test -- Base Sepolia");
  console.log("==============================================================");

  // ---- Step 1: Setup accounts ----
  step("1. Setup Accounts & Clients");

  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY environment variable is required");
    console.error("Usage: PRIVATE_KEY=0x... pnpm example:e2e-ai-hooks");
    process.exit(1);
  }

  const mnemonic = generateMnemonic(english);

  const payerAccount = privateKeyToAccount(privateKey);
  const merchantAccount = mnemonicToAccount(mnemonic, { addressIndex: 0 });
  const arbiterAccount = mnemonicToAccount(mnemonic, { addressIndex: 1 });

  log(`Payer:    ${payerAccount.address}`);
  log(`Merchant: ${merchantAccount.address}`);
  log(`Arbiter:  ${arbiterAccount.address}`);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const payerWallet = createWalletClient({
    account: payerAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const merchantWallet = createWalletClient({
    account: merchantAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const arbiterWallet = createWalletClient({
    account: arbiterAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  // Check payer balance
  const ethBalance = await publicClient.getBalance({ address: payerAccount.address });
  const usdcBalance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [payerAccount.address],
  });

  log(`Payer ETH balance:  ${formatEther(ethBalance)} ETH`);
  log(`Payer USDC balance: ${formatUnits(usdcBalance, 6)} USDC`);

  if (ethBalance < GAS_FUNDING * 5n) {
    console.error(
      `Error: Insufficient ETH. Need at least ${formatEther(GAS_FUNDING * 5n)} ETH for gas.`,
    );
    process.exit(1);
  }
  if (usdcBalance < PAYMENT_AMOUNT) {
    console.error(
      `Error: Insufficient USDC. Need at least ${formatUnits(PAYMENT_AMOUNT, 6)} USDC.`,
    );
    process.exit(1);
  }

  // Fund merchant and arbiter with ETH for gas
  log("Funding merchant with ETH for gas...");
  const fundMerchantTx = await payerWallet.sendTransaction({
    to: merchantAccount.address,
    value: GAS_FUNDING,
    chain: baseSepolia,
    account: payerAccount,
  });
  await waitForTx(publicClient, fundMerchantTx);

  log("Funding arbiter with ETH for gas...");
  const fundArbiterTx = await payerWallet.sendTransaction({
    to: arbiterAccount.address,
    value: GAS_FUNDING,
    chain: baseSepolia,
    account: payerAccount,
  });
  await waitForTx(publicClient, fundArbiterTx);

  pass("Setup accounts and fund derived wallets");

  const networkConfig = getNetworkConfig(NETWORK_ID);
  const addresses = resolveAddresses(NETWORK_ID);

  // ---- Step 2: Deploy Operator ----
  step("2. Deploy Marketplace Operator");

  const deployResult = await deployMarketplaceOperator(payerWallet, publicClient, NETWORK_ID, {
    feeRecipient: payerAccount.address,
    arbiter: arbiterAccount.address,
    escrowPeriodSeconds: 604800n,
    freezeDurationSeconds: 259200n,
    operatorFeeBps: 100n,
  });

  log(`Operator: ${deployResult.operatorAddress}`);
  pass("Deploy operator", deployResult.txHashes[0]);

  // ---- Step 3: Construct PaymentInfo ----
  step("3. Construct PaymentInfo");

  const now = BigInt(Math.floor(Date.now() / 1000));
  const salt = BigInt(Date.now());

  const paymentInfo: PaymentInfo = {
    operator: deployResult.operatorAddress as Address,
    payer: payerAccount.address,
    receiver: merchantAccount.address,
    token: USDC_ADDRESS,
    maxAmount: PAYMENT_AMOUNT,
    preApprovalExpiry: now + 3600n,
    authorizationExpiry: now + 3600n,
    refundExpiry: now + 864000n,
    minFeeBps: 0,
    maxFeeBps: 10000,
    feeReceiver: deployResult.operatorAddress as Address,
    salt,
  };

  pass("Construct PaymentInfo");

  // ---- Step 4: Authorize Payment ----
  step("4. Payer Authorizes Payment");

  const escrowNonce = computeEscrowNonce(
    paymentInfo,
    networkConfig.authCaptureEscrow as Address,
    84532,
  );

  log("Signing ERC-3009 ReceiveWithAuthorization...");
  const erc3009Signature = await signERC3009Authorization(payerWallet, USDC_ADDRESS, {
    from: payerAccount.address,
    to: networkConfig.tokenCollector as `0x${string}`,
    value: PAYMENT_AMOUNT,
    validAfter: 0n,
    validBefore: paymentInfo.preApprovalExpiry,
    nonce: escrowNonce,
  });

  log("Calling operator.authorize()...");
  const authorizeTx = await payerWallet.writeContract({
    address: deployResult.operatorAddress as Address,
    abi: PaymentOperatorABI,
    functionName: "authorize",
    args: [
      toAbiPaymentInfo(paymentInfo),
      PAYMENT_AMOUNT,
      networkConfig.tokenCollector,
      erc3009Signature,
    ],
    chain: baseSepolia,
    account: payerAccount,
  });
  await waitForTx(publicClient, authorizeTx);

  pass("Authorize payment (USDC in escrow)", authorizeTx);

  // ---- Step 5: Create SDK instances ----
  step("5. Create SDK Instances");

  const client = new X402rClient({
    publicClient,
    walletClient: payerWallet,
    operatorAddress: deployResult.operatorAddress as Address,
    escrowAddress: addresses.escrowAddress,
    refundRequestAddress: addresses.refundRequestAddress,
    refundRequestEvidenceAddress: addresses.evidenceAddress,
    chainId: addresses.chainId,
  });

  const merchant = new X402rMerchant({
    publicClient,
    walletClient: merchantWallet,
    operatorAddress: deployResult.operatorAddress as Address,
    escrowAddress: addresses.escrowAddress,
    refundRequestAddress: addresses.refundRequestAddress,
    refundRequestEvidenceAddress: addresses.evidenceAddress,
    chainId: addresses.chainId,
  });

  const arbiter = new X402rArbiter({
    publicClient,
    walletClient: arbiterWallet,
    operatorAddress: deployResult.operatorAddress as Address,
    escrowAddress: addresses.escrowAddress,
    refundRequestAddress: addresses.refundRequestAddress,
    refundRequestEvidenceAddress: addresses.evidenceAddress,
    arbiterRegistryAddress: addresses.arbiterRegistryAddress,
    chainId: addresses.chainId,
  });

  pass("Create SDK instances");

  // ---- Step 6: Payer Requests Refund ----
  step("6. Payer Requests Refund");

  const { txHash: refundReqTx } = await client.requestRefund(paymentInfo, PAYMENT_AMOUNT, 0n);
  await waitForTx(publicClient, refundReqTx);

  const refundStatus = await client.getRefundStatus(paymentInfo, 0n);
  log(`Refund status: ${refundStatus} (expected ${RequestStatus.Pending} = Pending)`);

  if (refundStatus === RequestStatus.Pending) {
    pass("Request refund (status = Pending)", refundReqTx);
  } else {
    fail("Request refund", `Expected Pending, got ${refundStatus}`);
  }

  // ---- Step 7: Payer Submits Evidence ----
  step("7. Payer Submits Evidence");

  const { txHash: payerEvidenceTx } = await client.submitEvidence(
    paymentInfo,
    0n,
    "QmPayerEvidence_AIHooksE2E",
  );
  await waitForTx(publicClient, payerEvidenceTx);
  pass("Payer submits evidence", payerEvidenceTx);

  // ---- Step 8: Merchant Submits Counter-Evidence ----
  step("8. Merchant Submits Counter-Evidence");

  const { txHash: merchantEvidenceTx } = await merchant.submitEvidence(
    paymentInfo,
    0n,
    "QmMerchantEvidence_AIHooksE2E",
  );
  await waitForTx(publicClient, merchantEvidenceTx);
  pass("Merchant submits counter-evidence", merchantEvidenceTx);

  // ---- Step 9: Create Webhook Handler & Run AI Evaluation ----
  step("9. AI Hooks Pipeline: Fetch Evidence + Evaluate + Auto-Submit Decision");

  // Rule-based "AI": if payer evidence exists, approve
  const evaluationHook = async (ctx: CaseEvaluationContext) => {
    log(`  Hook received ${ctx.evidence?.length ?? 0} evidence entries`);
    if (ctx.evidenceContent) {
      for (let i = 0; i < ctx.evidenceContent.length; i++) {
        log(
          `  Evidence[${i}] content: ${ctx.evidenceContent[i] === null ? "null (IPFS not available)" : "fetched"}`,
        );
      }
    }

    const hasPayerEvidence = ctx.evidence?.some(e => e.role === 0);
    return {
      decision: hasPayerEvidence ? ("approve" as const) : ("deny" as const),
      reasoning: hasPayerEvidence ? "Payer evidence present" : "No payer evidence",
      confidence: 0.9,
    };
  };

  const handler = createWebhookHandler({
    arbiter,
    evaluationHook,
    fetchEvidence: true,
    autoSubmitDecision: true,
    confidenceThreshold: 0.7,
  });

  // Build the context with real data
  const escrowHash = computePaymentInfoHash(
    paymentInfo,
    networkConfig.authCaptureEscrow as Address,
    84532,
  );

  const paymentState = await arbiter.getPaymentState(paymentInfo);
  const currentRefundStatus = await arbiter.getRefundStatus(paymentInfo, 0n);

  const context: CaseEvaluationContext = {
    paymentInfo,
    nonce: 0n,
    paymentState,
    refundStatus: currentRefundStatus,
    paymentInfoHash: escrowHash,
  };

  log("Calling webhook handler (evidence fetch + evaluate + auto-submit)...");
  const handlerResult = await handler(context);

  log(`Decision: ${handlerResult.decision}`);
  log(`Confidence: ${handlerResult.confidence}`);
  log(`Executed: ${handlerResult.executed}`);
  log(`TxHash: ${handlerResult.txHash ?? "none"}`);
  log(`Reasoning: ${handlerResult.reasoning ?? "none"}`);

  // Verify handler result
  let handlerPassed = true;

  if (handlerResult.decision !== "approve") {
    fail("Handler decision", `Expected 'approve', got '${handlerResult.decision}'`);
    handlerPassed = false;
  }

  if (!handlerResult.executed) {
    fail("Handler execution", "Expected executed=true");
    handlerPassed = false;
  }

  if (!handlerResult.txHash) {
    fail("Handler txHash", "Expected a valid tx hash");
    handlerPassed = false;
  }

  if (handlerResult.confidence !== 0.9) {
    fail("Handler confidence", `Expected 0.9, got ${handlerResult.confidence}`);
    handlerPassed = false;
  }

  // Check evidence was fetched
  if (context.evidence && context.evidence.length === 2) {
    log(`Evidence fetched: ${context.evidence.length} entries`);
  } else {
    fail("Evidence fetch", `Expected 2 entries, got ${context.evidence?.length ?? 0}`);
    handlerPassed = false;
  }

  if (handlerPassed) {
    pass("AI hooks pipeline (evidence fetch + evaluate + auto-submit)", handlerResult.txHash);
  }

  // ---- Step 10: Verify On-Chain State ----
  step("10. Verify On-Chain Decision");

  if (handlerResult.txHash) {
    await waitForTx(publicClient, handlerResult.txHash);
  }

  const approvedStatus = await arbiter.getRefundStatus(paymentInfo, 0n);
  log(`Refund status: ${approvedStatus} (expected ${RequestStatus.Approved} = Approved)`);

  if (approvedStatus === RequestStatus.Approved) {
    pass("On-chain refund status = Approved");
  } else {
    fail("On-chain refund status", `Expected Approved, got ${approvedStatus}`);
  }

  // ---- Step 11: Execute Refund ----
  step("11. Execute Refund");

  const payerUsdcBefore = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [payerAccount.address],
  });

  log("Executing refund in escrow...");
  const { txHash: executeTx } = await arbiter.executeRefundInEscrow(paymentInfo, PAYMENT_AMOUNT);
  await waitForTx(publicClient, executeTx);

  const escrowStateAfter = await publicClient.readContract({
    address: networkConfig.authCaptureEscrow as Address,
    abi: AuthCaptureEscrowABI,
    functionName: "paymentState",
    args: [escrowHash],
  });

  const [, capturableAfter] = escrowStateAfter as [boolean, bigint, bigint];

  const payerUsdcAfter = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [payerAccount.address],
  });

  const usdcRecovered = payerUsdcAfter - payerUsdcBefore;
  log(`Payer USDC recovered: ${formatUnits(usdcRecovered, 6)} USDC`);

  if (capturableAfter === 0n && usdcRecovered > 0n) {
    pass("Execute refund (escrow emptied, USDC returned)", executeTx);
  } else {
    fail(
      "Execute refund",
      `capturable=${capturableAfter} (expected 0), recovered=${usdcRecovered} (expected > 0)`,
    );
  }

  // ---- Summary ----
  console.log("\n==============================================================");
  console.log("                    TEST SUMMARY");
  console.log("==============================================================\n");

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  for (const r of results) {
    const icon = r.pass ? "PASS" : "FAIL";
    console.log(`  ${icon}: ${r.name}`);
    if (r.txHash) console.log(`    ${SCANNER}/tx/${r.txHash}`);
    if (r.error) console.log(`    ERROR: ${r.error}`);
  }

  console.log(`\n  Result: ${passed} passed, ${failed} failed out of ${results.length} steps`);

  if (failed > 0) {
    console.log("\n  AI HOOKS E2E TEST FAILED");
    process.exit(1);
  } else {
    console.log("\n  AI HOOKS E2E TEST PASSED -- Full AI hooks pipeline verified on-chain");
  }
}

main().catch(error => {
  console.error("\nE2E test failed with error:", error);
  process.exit(1);
});
