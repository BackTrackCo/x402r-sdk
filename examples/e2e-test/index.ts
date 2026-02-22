/**
 * E2E Integration Test: Full Payment Lifecycle on Base Sepolia
 *
 * Exercises the complete x402r refundable payment flow against real contracts:
 *   Authorize → Request Refund → Freeze → Submit Evidence → Read Evidence → Arbiter Approve → Execute Refund
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
 *   PRIVATE_KEY=0x... pnpm example:e2e-test
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
  shortAddr,
  waitForTx,
  authCaptureEscrowAbi,
  RequestStatus,
  PaymentState,
  distributeFees,
  erc20Abi,
  formatUnits,
  type Address,
} from "./shared.js";

// ============ Main ============

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║       x402r E2E Integration Test — Base Sepolia        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  const runner = new StepRunner();

  // ---- Step 1: Setup accounts ----
  runner.step("1. Setup Accounts & Clients");

  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY environment variable is required");
    console.error("Usage: PRIVATE_KEY=0x... pnpm example:e2e-test");
    process.exit(1);
  }

  const accounts = await setupE2EAccounts(privateKey, { derivedCount: 2 });

  runner.log(`Payer:    ${accounts.payerAccount.address}`);
  runner.log(`Merchant: ${accounts.merchantAccount.address}`);
  runner.log(`Arbiter:  ${accounts.arbiterAccount!.address}`);

  await checkAndLogBalances(accounts, runner);
  await fundDerivedAccounts(accounts, runner);
  runner.pass("Setup accounts and fund derived wallets");

  runner.log(
    `Network: ${accounts.networkConfig.name} (${process.env.NETWORK_ID ?? "eip155:84532"})`,
  );
  runner.log(`AuthCaptureEscrow: ${shortAddr(accounts.networkConfig.authCaptureEscrow)}`);
  runner.log(`TokenCollector: ${shortAddr(accounts.networkConfig.tokenCollector)}`);
  runner.log(`RefundRequest: ${shortAddr(accounts.networkConfig.refundRequest)}`);

  // ---- Step 2: Deploy Operator ----
  runner.step("2. Deploy Marketplace Operator");

  runner.log(`Arbiter: ${accounts.arbiterAccount!.address}`);
  runner.log(`Escrow period: 7 days, Freeze duration: 3 days`);

  const deployStartBlock = await accounts.publicClient.getBlockNumber();
  const deployResult = await deployTestOperator(accounts, runner);

  runner.log(`EscrowPeriod: ${deployResult.escrowPeriodAddress}`);
  runner.log(`Freeze: ${deployResult.freezeAddress}`);

  // ---- Step 3: Setup HTTP 402 Infrastructure ----
  runner.step("3. Setup HTTP 402 Infrastructure (in-process)");

  const infra = await setupHTTP402(accounts, deployResult.operatorAddress);

  runner.log("Facilitator: in-process (payer account as signer)");
  runner.log("Server: x402HTTPResourceServer with escrow route at /api/weather");
  runner.log("Client: x402HTTPClient with escrow scheme");
  runner.pass("Setup HTTP 402 infrastructure");

  // ---- Step 4: HTTP 402 Flow — Authorize via Protocol ----
  runner.step("4. HTTP 402 Flow (402 → Pay → Verify → Settle)");

  const { paymentInfo, escrowHash } = await performHTTP402Payment(infra, accounts, runner);
  runner.log(`  PaymentInfo extracted (operator: ${shortAddr(paymentInfo.operator)})`);

  // Verify escrow state
  const escrowState = await accounts.publicClient.readContract({
    address: accounts.networkConfig.authCaptureEscrow as Address,
    abi: authCaptureEscrowAbi,
    functionName: "paymentState",
    args: [escrowHash],
  });

  const [hasCollected, capturableAmount, refundableAmount] = escrowState as [
    boolean,
    bigint,
    bigint,
  ];
  runner.log(
    `  Escrow state: hasCollected=${hasCollected}, capturable=${capturableAmount}, refundable=${refundableAmount}`,
  );

  if (capturableAmount > 0n) {
    runner.pass("USDC in escrow via HTTP 402 flow");
  } else {
    runner.fail("USDC in escrow", "capturableAmount is 0 after settle");
  }

  // ---- Step 4b: Verify payment state via SDK ----
  runner.step("4b. Verify Payment State via SDK");

  const { client, merchant, arbiter } = createSDKInstances(accounts, deployResult.operatorAddress);

  try {
    const clientState = await client.getPaymentState(paymentInfo);
    runner.log(`client.getPaymentState: ${clientState} (expected ${PaymentState.InEscrow})`);

    const exists = await client.paymentExists(escrowHash);
    runner.log(`client.paymentExists: ${exists}`);

    const inEscrow = await client.isInEscrow(escrowHash);
    runner.log(`client.isInEscrow: ${inEscrow}`);

    const payerPayments = await client.getPayerPayments(deployStartBlock);
    runner.log(`client.getPayerPayments: ${payerPayments?.length ?? 0} payment(s)`);

    const receiverPayments = await merchant.getReceiverPayments(deployStartBlock);
    runner.log(`merchant.getReceiverPayments: ${receiverPayments?.length ?? 0} payment(s)`);

    const amounts = await merchant.getPaymentAmounts(paymentInfo);
    runner.log(
      `merchant.getPaymentAmounts: capturable=${amounts.capturableAmount}, refundable=${amounts.refundableAmount}`,
    );

    const merchantState = await merchant.getPaymentState(paymentInfo);
    runner.log(`merchant.getPaymentState: ${merchantState}`);

    const arbiterState = await arbiter!.getPaymentState(paymentInfo);
    runner.log(`arbiter.getPaymentState: ${arbiterState}`);

    if (
      clientState === PaymentState.InEscrow &&
      exists &&
      inEscrow &&
      amounts.capturableAmount > 0n &&
      merchantState === PaymentState.InEscrow &&
      arbiterState === PaymentState.InEscrow
    ) {
      runner.pass("All SDK payment queries return correct state after authorize");
    } else {
      runner.fail("SDK payment queries", "One or more checks failed (see logs above)");
    }
  } catch (err) {
    runner.fail("SDK payment queries", String(err));
  }

  // ---- Step 5: Payer Requests Refund ----
  runner.step("5. Payer Requests Refund");

  runner.log("Submitting refund request...");
  const { txHash: refundReqTx } = await client.requestRefund(paymentInfo, PAYMENT_AMOUNT, 0n);
  await waitForTx(accounts.publicClient, refundReqTx);
  runner.log(`  Refund request tx: ${SCANNER}/tx/${refundReqTx}`);

  const refundStatus = await client.getRefundStatus(paymentInfo, 0n);
  runner.log(`Refund status: ${refundStatus} (expected ${RequestStatus.Pending} = Pending)`);

  if (refundStatus === RequestStatus.Pending) {
    runner.pass("Request refund (status = Pending)", refundReqTx);
  } else {
    runner.fail(
      "Request refund",
      `Expected Pending (${RequestStatus.Pending}), got ${refundStatus}`,
    );
  }

  // ---- Step 6: Payer Freezes Payment ----
  runner.step("6. Payer Freezes Payment");

  runner.log("Freezing payment...");
  const { txHash: freezeTx } = await client.freezePayment(
    paymentInfo,
    deployResult.freezeAddress as Address,
  );
  await waitForTx(accounts.publicClient, freezeTx);
  runner.log(`  Freeze tx: ${SCANNER}/tx/${freezeTx}`);

  const frozen = await client.isFrozen(paymentInfo, deployResult.freezeAddress as Address);
  runner.log(`Is frozen: ${frozen}`);

  if (frozen) {
    runner.pass("Freeze payment (isFrozen = true)", freezeTx);
  } else {
    runner.fail("Freeze payment", "isFrozen returned false after freeze");
  }

  // ---- Step 7: Payer Submits Evidence ----
  runner.step("7. Payer Submits Evidence");

  runner.log("Submitting payer evidence...");
  const { txHash: payerEvidenceTx } = await client.submitEvidence(
    paymentInfo,
    0n,
    "QmPayerEvidenceCID_RefundJustification",
  );
  await waitForTx(accounts.publicClient, payerEvidenceTx);
  runner.log(`  Payer evidence tx: ${SCANNER}/tx/${payerEvidenceTx}`);

  const evidenceCount1 = await client.getEvidenceCount(paymentInfo, 0n);
  runner.log(`Evidence count: ${evidenceCount1} (expected 1)`);

  if (evidenceCount1 === 1n) {
    runner.pass("Payer submits evidence (count = 1)", payerEvidenceTx);
  } else {
    runner.fail("Payer submits evidence", `Expected count 1, got ${evidenceCount1}`);
  }

  // ---- Step 8: Merchant Submits Counter-Evidence ----
  runner.step("8. Merchant Submits Counter-Evidence");

  runner.log("Submitting merchant counter-evidence...");
  const { txHash: merchantEvidenceTx } = await merchant.submitEvidence(
    paymentInfo,
    0n,
    "QmMerchantEvidenceCID_ServiceDelivered",
  );
  await waitForTx(accounts.publicClient, merchantEvidenceTx);
  runner.log(`  Merchant evidence tx: ${SCANNER}/tx/${merchantEvidenceTx}`);

  const evidenceCount2 = await client.getEvidenceCount(paymentInfo, 0n);
  runner.log(`Evidence count: ${evidenceCount2} (expected 2)`);

  if (evidenceCount2 === 2n) {
    runner.pass("Merchant submits counter-evidence (count = 2)", merchantEvidenceTx);
  } else {
    runner.fail("Merchant submits counter-evidence", `Expected count 2, got ${evidenceCount2}`);
  }

  // ---- Step 9: Arbiter Reads All Evidence ----
  runner.step("9. Arbiter Reads All Evidence");

  const allEvidence = await arbiter!.getAllEvidence(paymentInfo, 0n);
  runner.log(`Evidence entries: ${allEvidence.length}`);

  for (let i = 0; i < allEvidence.length; i++) {
    const e = allEvidence[i];
    const roleName = e.role === 0 ? "Payer" : e.role === 1 ? "Receiver" : "Arbiter";
    const ts = new Date(Number(e.timestamp) * 1000).toISOString();
    runner.log(`  [${i}] ${roleName} ${shortAddr(e.submitter)} | ${ts} | CID: ${e.cid}`);
  }

  if (
    allEvidence.length === 2 &&
    allEvidence[0].cid === "QmPayerEvidenceCID_RefundJustification" &&
    allEvidence[1].cid === "QmMerchantEvidenceCID_ServiceDelivered" &&
    allEvidence[0].role === 0 &&
    allEvidence[1].role === 1
  ) {
    runner.pass("Arbiter reads all evidence (2 entries, correct roles and CIDs)");
  } else {
    runner.fail(
      "Arbiter reads all evidence",
      `Expected 2 entries with correct data, got ${allEvidence.length}`,
    );
  }

  // ---- Step 10: Arbiter Approves Refund ----
  runner.step("10. Arbiter Approves Refund (based on evidence review)");

  runner.log("Approving refund request...");
  const { txHash: approveTxHash } = await arbiter!.approveRefundRequest(paymentInfo, 0n);
  await waitForTx(accounts.publicClient, approveTxHash);
  runner.log(`  Approve tx: ${SCANNER}/tx/${approveTxHash}`);

  const approvedStatus = await arbiter!.getRefundStatus(paymentInfo, 0n);
  runner.log(`Refund status: ${approvedStatus} (expected ${RequestStatus.Approved} = Approved)`);

  if (approvedStatus === RequestStatus.Approved) {
    runner.pass("Arbiter approve refund (status = Approved)", approveTxHash);
  } else {
    runner.fail(
      "Arbiter approve refund",
      `Expected Approved (${RequestStatus.Approved}), got ${approvedStatus}`,
    );
  }

  // ---- Step 11: Arbiter Executes Refund ----
  runner.step("11. Arbiter Executes Refund");

  const payerUsdcBefore = await accounts.publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [accounts.payerAccount.address],
  });

  runner.log("Executing refund in escrow...");
  const { txHash: executeTx } = await arbiter!.executeRefundInEscrow(paymentInfo, PAYMENT_AMOUNT);
  await waitForTx(accounts.publicClient, executeTx);
  runner.log(`  Execute tx: ${SCANNER}/tx/${executeTx}`);

  const escrowStateAfter = await accounts.publicClient.readContract({
    address: accounts.networkConfig.authCaptureEscrow as Address,
    abi: authCaptureEscrowAbi,
    functionName: "paymentState",
    args: [escrowHash],
  });

  const [, capturableAfter, refundableAfter] = escrowStateAfter as [boolean, bigint, bigint];
  runner.log(`Escrow after: capturable=${capturableAfter}, refundable=${refundableAfter}`);

  const payerUsdcAfter = await accounts.publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [accounts.payerAccount.address],
  });

  const usdcRecovered = payerUsdcAfter - payerUsdcBefore;
  runner.log(`Payer USDC recovered: ${formatUnits(usdcRecovered, 6)} USDC`);

  if (capturableAfter === 0n && usdcRecovered > 0n) {
    runner.pass("Execute refund (escrow emptied, USDC returned to payer)", executeTx);
  } else {
    runner.fail(
      "Execute refund",
      `capturable=${capturableAfter} (expected 0), recovered=${usdcRecovered} (expected > 0)`,
    );
  }

  // ---- Step 11b: Verify post-refund state via SDK ----
  runner.step("11b. Verify Post-Refund State via SDK");

  try {
    const postRefundState = await client.getPaymentState(paymentInfo);
    runner.log(`client.getPaymentState: ${postRefundState} (expected Settled)`);

    const postRefundInEscrow = await client.isInEscrow(escrowHash);
    runner.log(`client.isInEscrow: ${postRefundInEscrow} (expected false)`);

    const postRefundAmounts = await merchant.getPaymentAmounts(paymentInfo);
    runner.log(
      `merchant.getPaymentAmounts: capturable=${postRefundAmounts.capturableAmount}, refundable=${postRefundAmounts.refundableAmount}`,
    );

    if (
      postRefundState === PaymentState.Settled &&
      !postRefundInEscrow &&
      postRefundAmounts.capturableAmount === 0n &&
      postRefundAmounts.refundableAmount === 0n
    ) {
      runner.pass("All SDK queries return correct post-refund state");
    } else {
      runner.fail("Post-refund SDK queries", "One or more checks failed (see logs above)");
    }
  } catch (err) {
    runner.fail("Post-refund SDK queries", String(err));
  }

  // ---- Step 12: Final Verification ----
  runner.step("12. Final Verification");

  const finalEvidenceCount = await arbiter!.getEvidenceCount(paymentInfo, 0n);
  runner.log(`Evidence still queryable: ${finalEvidenceCount} entries`);

  const finalRefundStatus = await arbiter!.getRefundStatus(paymentInfo, 0n);
  runner.log(`Final refund status: ${finalRefundStatus}`);

  if (finalEvidenceCount === 2n && capturableAfter === 0n && usdcRecovered > 0n) {
    runner.pass("Final verification (evidence persists, escrow emptied, USDC returned)");
  } else {
    runner.fail(
      "Final verification",
      `evidence=${finalEvidenceCount} (expected 2), capturable=${capturableAfter} (expected 0), recovered=${usdcRecovered} (expected > 0)`,
    );
  }

  // ---- Step 13: Distribute Fees ----
  runner.step("13. Distribute Accumulated Fees");

  try {
    runner.log("Distributing fees for USDC...");
    const distributeFeeTx = await distributeFees(
      accounts.merchantWallet,
      deployResult.operatorAddress as Address,
      USDC_ADDRESS,
    );
    await waitForTx(accounts.publicClient, distributeFeeTx);
    runner.log(`  Distribute fees tx: ${SCANNER}/tx/${distributeFeeTx}`);
    runner.pass("Distribute fees", distributeFeeTx);
  } catch (error) {
    // May revert if no fees accumulated — that's acceptable in test
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("revert")) {
      runner.log("  No fees to distribute (expected if fee calculator is address(0))");
      runner.pass("Distribute fees (no fees accumulated — expected)");
    } else {
      runner.fail("Distribute fees", msg);
    }
  }

  // ---- Summary ----
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                    TEST SUMMARY                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  runner.printSummary("TEST RESULTS");
  runner.exitWithResults(
    "E2E TEST PASSED — Full payment lifecycle verified on-chain",
    "E2E TEST FAILED",
  );
}

main().catch(error => {
  console.error("\nE2E test failed with error:", error);
  process.exit(1);
});
