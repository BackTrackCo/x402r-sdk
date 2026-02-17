/**
 * E2E Test: PaymentInfo Recovery After Restart
 *
 * Tests the payment recovery feature:
 *   1. Deploy operator → Authorize payment via HTTP 402
 *   2. Create NEW client (simulates restart) → getPaymentDetails() via escrow events
 *   3. Verify cache-fill → getPaymentDetails() from MemoryPaymentStore
 *   4. Create THIRD client with empty store → verify event fallback still works
 *   5. getPayerPayments() returns full PaymentInfo[]
 *   6. FilePaymentStore: save → delete → re-recover from events
 *
 * Usage:
 *   PRIVATE_KEY=0x... pnpm tsx examples/e2e-test/payment-recovery.ts
 */

import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  StepRunner,
  PAYMENT_AMOUNT,
  setupE2EAccounts,
  checkAndLogBalances,
  deployTestOperator,
  setupHTTP402,
  performHTTP402Payment,
  waitForTx,
  AuthCaptureEscrowABI,
  type Address,
} from "./shared.js";
import { MemoryPaymentStore, FilePaymentStore, resolveAddresses } from "@x402r/core";
import { X402rClient } from "@x402r/client";
import { X402rMerchant } from "@x402r/merchant";
import { NETWORK_ID } from "./shared.js";

// ============ Main ============

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║    x402r E2E: PaymentInfo Recovery After Restart       ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  const runner = new StepRunner();

  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY environment variable required");
    process.exit(1);
  }

  // ---- Setup ----
  runner.step("1. Setup Accounts");

  const accounts = await setupE2EAccounts(privateKey, { derivedCount: 1 });

  runner.log(`Payer:    ${accounts.payerAccount.address}`);
  runner.log(`Merchant: ${accounts.merchantAccount.address}`);

  await checkAndLogBalances(accounts, runner);

  const addresses = resolveAddresses(NETWORK_ID);

  // ---- Deploy operator ----
  runner.step("2. Deploy Operator");

  const deployStartBlock = await accounts.publicClient.getBlockNumber();
  const deployResult = await deployTestOperator(accounts, runner);

  // ---- Authorize payment via HTTP 402 ----
  runner.step("3. Authorize Payment via HTTP 402");

  const infra = await setupHTTP402(accounts, deployResult.operatorAddress);
  const { paymentInfo, escrowHash } = await performHTTP402Payment(infra, accounts, runner);

  runner.log(`Payment hash: ${escrowHash.slice(0, 18)}...`);

  // Verify funds in escrow
  const escrowState = (await accounts.publicClient.readContract({
    address: accounts.networkConfig.authCaptureEscrow as Address,
    abi: AuthCaptureEscrowABI,
    functionName: "paymentState",
    args: [escrowHash],
  })) as [boolean, bigint, bigint];

  runner.assert(escrowState[1] > 0n, "Funds in escrow after authorize");

  // ======================================================================
  // CORE TESTS: PaymentInfo Recovery
  // ======================================================================

  // ---- Test A: New client with NO store → recover from escrow events ----
  runner.step("4. Recovery via Escrow Events (no store)");

  const clientNoStore = new X402rClient({
    publicClient: accounts.publicClient,
    walletClient: accounts.payerWallet,
    operatorAddress: deployResult.operatorAddress as Address,
    escrowAddress: addresses.escrowAddress,
    refundRequestAddress: addresses.refundRequestAddress,
    chainId: addresses.chainId,
  });

  const recoveredFromEvents = await clientNoStore.getPaymentDetails(escrowHash, deployStartBlock);

  runner.assert(
    recoveredFromEvents.operator.toLowerCase() === paymentInfo.operator.toLowerCase(),
    "Recovered operator matches",
  );
  runner.assert(
    recoveredFromEvents.payer.toLowerCase() === paymentInfo.payer.toLowerCase(),
    "Recovered payer matches",
  );
  runner.assert(
    recoveredFromEvents.receiver.toLowerCase() === paymentInfo.receiver.toLowerCase(),
    "Recovered receiver matches",
  );
  runner.assert(
    recoveredFromEvents.maxAmount === paymentInfo.maxAmount,
    "Recovered maxAmount matches",
  );
  runner.assert(recoveredFromEvents.salt === paymentInfo.salt, "Recovered salt matches");
  runner.assert(
    recoveredFromEvents.minFeeBps === paymentInfo.minFeeBps,
    "Recovered minFeeBps matches",
  );
  runner.assert(
    recoveredFromEvents.maxFeeBps === paymentInfo.maxFeeBps,
    "Recovered maxFeeBps matches",
  );

  // ---- Test B: MemoryPaymentStore — cache-fill + instant lookup ----
  runner.step("5. MemoryPaymentStore Cache-Fill");

  const memStore = new MemoryPaymentStore();

  const clientWithMemStore = new X402rClient({
    publicClient: accounts.publicClient,
    walletClient: accounts.payerWallet,
    operatorAddress: deployResult.operatorAddress as Address,
    escrowAddress: addresses.escrowAddress,
    refundRequestAddress: addresses.refundRequestAddress,
    chainId: addresses.chainId,
    paymentStore: memStore,
  });

  const recovered2 = await clientWithMemStore.getPaymentDetails(escrowHash, deployStartBlock);
  runner.assert(recovered2.salt === paymentInfo.salt, "Event fallback → cache-fill works");

  const cached = await memStore.load(escrowHash);
  runner.assert(cached !== null, "PaymentInfo saved to MemoryPaymentStore after event lookup");
  runner.assert(cached!.salt === paymentInfo.salt, "Cached salt matches original");

  const fromCache = await clientWithMemStore.getPaymentDetails(escrowHash, deployStartBlock);
  runner.assert(
    fromCache.salt === paymentInfo.salt,
    "Subsequent lookup from cache returns correct data",
  );

  // ---- Test C: getPayerPayments() returns full PaymentInfo ----
  runner.step("6. getPayerPayments() Returns Full PaymentInfo");

  const payments = await clientWithMemStore.getPayerPayments(deployStartBlock);
  runner.assert(payments.length > 0, "getPayerPayments returns at least 1 payment");
  runner.assert(payments[0].hash === escrowHash, "First payment hash matches");
  runner.assert(
    payments[0].paymentInfo.salt === paymentInfo.salt,
    "First payment PaymentInfo.salt matches",
  );
  runner.assert(
    payments[0].paymentInfo.payer.toLowerCase() === accounts.payerAccount.address.toLowerCase(),
    "First payment payer matches wallet",
  );

  // ---- Test D: FilePaymentStore — persist, delete, re-recover ----
  runner.step("7. FilePaymentStore Persistence & Recovery");

  const tmpDir = mkdtempSync(join(tmpdir(), "x402r-e2e-"));
  runner.log(`Temp dir: ${tmpDir}`);

  try {
    const fileStore = new FilePaymentStore(tmpDir);

    const clientWithFileStore = new X402rClient({
      publicClient: accounts.publicClient,
      walletClient: accounts.payerWallet,
      operatorAddress: deployResult.operatorAddress as Address,
      escrowAddress: addresses.escrowAddress,
      refundRequestAddress: addresses.refundRequestAddress,
      chainId: addresses.chainId,
      paymentStore: fileStore,
    });

    const fromFile1 = await clientWithFileStore.getPaymentDetails(escrowHash, deployStartBlock);
    runner.assert(fromFile1.salt === paymentInfo.salt, "FilePaymentStore: event fallback works");

    const filePath = join(tmpDir, `${escrowHash}.json`);
    runner.assert(existsSync(filePath), "FilePaymentStore: JSON file created on disk");

    const fileStore2 = new FilePaymentStore(tmpDir);
    const fromFile2 = await fileStore2.load(escrowHash);
    runner.assert(
      fromFile2 !== null,
      "FilePaymentStore: survives new instance (simulated restart)",
    );
    runner.assert(fromFile2!.salt === paymentInfo.salt, "FilePaymentStore: persisted data matches");

    rmSync(tmpDir, { recursive: true, force: true });
    runner.assert(!existsSync(filePath), "FilePaymentStore: cache directory deleted");

    const fileStore3 = new FilePaymentStore(tmpDir);
    const clientAfterWipe = new X402rClient({
      publicClient: accounts.publicClient,
      walletClient: accounts.payerWallet,
      operatorAddress: deployResult.operatorAddress as Address,
      escrowAddress: addresses.escrowAddress,
      refundRequestAddress: addresses.refundRequestAddress,
      chainId: addresses.chainId,
      paymentStore: fileStore3,
    });

    const fromFile3 = await clientAfterWipe.getPaymentDetails(escrowHash, deployStartBlock);
    runner.assert(
      fromFile3.salt === paymentInfo.salt,
      "FilePaymentStore: re-recovers after disk wipe via events",
    );

    runner.assert(existsSync(filePath), "FilePaymentStore: file re-created after recovery");
  } finally {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ---- Test E: Merchant getReceiverPayments + getPaymentDetails ----
  runner.step("8. Merchant: getReceiverPayments + getPaymentDetails");

  const merchant = new X402rMerchant({
    publicClient: accounts.publicClient,
    walletClient: accounts.merchantWallet,
    operatorAddress: deployResult.operatorAddress as Address,
    escrowAddress: addresses.escrowAddress,
    refundRequestAddress: addresses.refundRequestAddress,
    chainId: addresses.chainId,
  });

  const receiverPayments = await merchant.getReceiverPayments(deployStartBlock);
  runner.assert(receiverPayments.length > 0, "Merchant: getReceiverPayments returns payments");
  runner.assert(
    receiverPayments[0].paymentInfo.salt === paymentInfo.salt,
    "Merchant: recovered PaymentInfo.salt matches",
  );
  runner.assert(
    receiverPayments[0].paymentInfo.receiver.toLowerCase() ===
      accounts.merchantAccount.address.toLowerCase(),
    "Merchant: receiver matches merchant wallet",
  );

  const merchantDetails = await merchant.getPaymentDetails(escrowHash, deployStartBlock);
  runner.assert(
    merchantDetails.maxAmount === paymentInfo.maxAmount,
    "Merchant: getPaymentDetails returns correct maxAmount",
  );

  // ============ Summary ============
  runner.printSummary("PAYMENT RECOVERY TEST RESULTS");
  runner.exitWithResults("ALL TESTS PASSED", "SOME TESTS FAILED");
}

main().catch(err => {
  console.error("\n  FATAL ERROR:", err.message);
  process.exit(1);
});
