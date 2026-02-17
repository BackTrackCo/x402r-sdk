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
  StepRunner,
  SCANNER,
  USDC_ADDRESS,
  PAYMENT_AMOUNT,
  setupE2EAccounts,
  checkAndLogBalances,
  fundDerivedAccounts,
  deployTestOperator,
  setupHTTP402,
  performHTTP402Payment,
  createSDKInstances,
  waitForTx,
  computePaymentInfoHash,
  AuthCaptureEscrowABI,
  RequestStatus,
  erc20Abi,
  formatUnits,
  type Address,
} from "./shared.js";
import { createWebhookHandler, type CaseEvaluationContext } from "@x402r/arbiter";

// ============ Main ============

async function main() {
  console.log("==============================================================");
  console.log("    x402r AI Hooks E2E Test -- Base Sepolia");
  console.log("==============================================================");

  const runner = new StepRunner();

  // ---- Step 1: Setup accounts ----
  runner.step("1. Setup Accounts & Clients");

  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY environment variable is required");
    console.error("Usage: PRIVATE_KEY=0x... pnpm example:e2e-ai-hooks");
    process.exit(1);
  }

  const accounts = await setupE2EAccounts(privateKey, { derivedCount: 2 });

  runner.log(`Payer:    ${accounts.payerAccount.address}`);
  runner.log(`Merchant: ${accounts.merchantAccount.address}`);
  runner.log(`Arbiter:  ${accounts.arbiterAccount!.address}`);

  await checkAndLogBalances(accounts, runner);
  await fundDerivedAccounts(accounts, runner);
  runner.pass("Setup accounts and fund derived wallets");

  // ---- Step 2: Deploy Operator ----
  runner.step("2. Deploy Marketplace Operator");

  const deployResult = await deployTestOperator(accounts, runner);

  // ---- Step 3: HTTP 402 Flow — Authorize via Protocol ----
  runner.step("3. HTTP 402 Flow (Authorize Payment)");

  const infra = await setupHTTP402(accounts, deployResult.operatorAddress);
  const { paymentInfo, escrowHash } = await performHTTP402Payment(infra, accounts, runner);
  runner.pass("Payment authorized via HTTP 402 flow");

  // ---- Step 4: Create SDK Instances ----
  runner.step("4. Create SDK Instances");

  const { client, merchant, arbiter } = createSDKInstances(accounts, deployResult.operatorAddress);
  runner.pass("Create SDK instances");

  // ---- Step 5: Payer Requests Refund ----
  runner.step("5. Payer Requests Refund");

  const { txHash: refundReqTx } = await client.requestRefund(paymentInfo, PAYMENT_AMOUNT, 0n);
  await waitForTx(accounts.publicClient, refundReqTx);

  const refundStatus = await client.getRefundStatus(paymentInfo, 0n);
  runner.log(`Refund status: ${refundStatus} (expected ${RequestStatus.Pending} = Pending)`);

  if (refundStatus === RequestStatus.Pending) {
    runner.pass("Request refund (status = Pending)", refundReqTx);
  } else {
    runner.fail("Request refund", `Expected Pending, got ${refundStatus}`);
  }

  // ---- Step 6: Payer Submits Evidence ----
  runner.step("6. Payer Submits Evidence");

  const { txHash: payerEvidenceTx } = await client.submitEvidence(
    paymentInfo,
    0n,
    "QmPayerEvidence_AIHooksE2E",
  );
  await waitForTx(accounts.publicClient, payerEvidenceTx);
  runner.pass("Payer submits evidence", payerEvidenceTx);

  // ---- Step 7: Merchant Submits Counter-Evidence ----
  runner.step("7. Merchant Submits Counter-Evidence");

  const { txHash: merchantEvidenceTx } = await merchant.submitEvidence(
    paymentInfo,
    0n,
    "QmMerchantEvidence_AIHooksE2E",
  );
  await waitForTx(accounts.publicClient, merchantEvidenceTx);
  runner.pass("Merchant submits counter-evidence", merchantEvidenceTx);

  // ---- Step 8: Create Webhook Handler & Run AI Evaluation ----
  runner.step("8. AI Hooks Pipeline: Fetch Evidence + Evaluate + Auto-Submit Decision");

  // Rule-based "AI": if payer evidence exists, approve
  const evaluationHook = async (ctx: CaseEvaluationContext) => {
    runner.log(`  Hook received ${ctx.evidence?.length ?? 0} evidence entries`);
    if (ctx.evidenceContent) {
      for (let i = 0; i < ctx.evidenceContent.length; i++) {
        runner.log(
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
    arbiter: arbiter!,
    evaluationHook,
    fetchEvidence: true,
    autoSubmitDecision: true,
    confidenceThreshold: 0.7,
  });

  const paymentState = await arbiter!.getPaymentState(paymentInfo);
  const currentRefundStatus = await arbiter!.getRefundStatus(paymentInfo, 0n);

  const context: CaseEvaluationContext = {
    paymentInfo,
    nonce: 0n,
    paymentState,
    refundStatus: currentRefundStatus,
    paymentInfoHash: escrowHash,
  };

  runner.log("Calling webhook handler (evidence fetch + evaluate + auto-submit)...");
  const handlerResult = await handler(context);

  runner.log(`Decision: ${handlerResult.decision}`);
  runner.log(`Confidence: ${handlerResult.confidence}`);
  runner.log(`Executed: ${handlerResult.executed}`);
  runner.log(`TxHash: ${handlerResult.txHash ?? "none"}`);
  runner.log(`Reasoning: ${handlerResult.reasoning ?? "none"}`);

  // Verify handler result
  let handlerPassed = true;

  if (handlerResult.decision !== "approve") {
    runner.fail("Handler decision", `Expected 'approve', got '${handlerResult.decision}'`);
    handlerPassed = false;
  }

  if (!handlerResult.executed) {
    runner.fail("Handler execution", "Expected executed=true");
    handlerPassed = false;
  }

  if (!handlerResult.txHash) {
    runner.fail("Handler txHash", "Expected a valid tx hash");
    handlerPassed = false;
  }

  if (handlerResult.confidence !== 0.9) {
    runner.fail("Handler confidence", `Expected 0.9, got ${handlerResult.confidence}`);
    handlerPassed = false;
  }

  if (context.evidence && context.evidence.length === 2) {
    runner.log(`Evidence fetched: ${context.evidence.length} entries`);
  } else {
    runner.fail("Evidence fetch", `Expected 2 entries, got ${context.evidence?.length ?? 0}`);
    handlerPassed = false;
  }

  if (handlerPassed) {
    runner.pass(
      "AI hooks pipeline (evidence fetch + evaluate + auto-submit)",
      handlerResult.txHash,
    );
  }

  // ---- Step 9: Verify On-Chain State ----
  runner.step("9. Verify On-Chain Decision");

  if (handlerResult.txHash) {
    await waitForTx(accounts.publicClient, handlerResult.txHash);
  }

  const approvedStatus = await arbiter!.getRefundStatus(paymentInfo, 0n);
  runner.log(`Refund status: ${approvedStatus} (expected ${RequestStatus.Approved} = Approved)`);

  if (approvedStatus === RequestStatus.Approved) {
    runner.pass("On-chain refund status = Approved");
  } else {
    runner.fail("On-chain refund status", `Expected Approved, got ${approvedStatus}`);
  }

  // ---- Step 10: Execute Refund ----
  runner.step("10. Execute Refund");

  const payerUsdcBefore = await accounts.publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [accounts.payerAccount.address],
  });

  runner.log("Executing refund in escrow...");
  const { txHash: executeTx } = await arbiter!.executeRefundInEscrow(paymentInfo, PAYMENT_AMOUNT);
  await waitForTx(accounts.publicClient, executeTx);

  const escrowStateAfter = await accounts.publicClient.readContract({
    address: accounts.networkConfig.authCaptureEscrow as Address,
    abi: AuthCaptureEscrowABI,
    functionName: "paymentState",
    args: [escrowHash],
  });

  const [, capturableAfter] = escrowStateAfter as [boolean, bigint, bigint];

  const payerUsdcAfter = await accounts.publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [accounts.payerAccount.address],
  });

  const usdcRecovered = payerUsdcAfter - payerUsdcBefore;
  runner.log(`Payer USDC recovered: ${formatUnits(usdcRecovered, 6)} USDC`);

  if (capturableAfter === 0n && usdcRecovered > 0n) {
    runner.pass("Execute refund (escrow emptied, USDC returned)", executeTx);
  } else {
    runner.fail(
      "Execute refund",
      `capturable=${capturableAfter} (expected 0), recovered=${usdcRecovered} (expected > 0)`,
    );
  }

  // ---- Summary ----
  runner.printSummary("AI HOOKS E2E TEST RESULTS");
  runner.exitWithResults(
    "AI HOOKS E2E TEST PASSED -- Full AI hooks pipeline verified on-chain",
    "AI HOOKS E2E TEST FAILED",
  );
}

main().catch(error => {
  console.error("\nE2E test failed with error:", error);
  process.exit(1);
});
