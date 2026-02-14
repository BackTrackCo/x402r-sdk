/**
 * E2E Test: PaymentInfo Recovery After Restart
 *
 * Tests the payment recovery feature (Tech Debt #14):
 *   1. Deploy operator → Authorize payment
 *   2. Create NEW client (simulates restart) → getPaymentDetails() via escrow events
 *   3. Verify cache-fill → getPaymentDetails() from MemoryPaymentStore
 *   4. Create THIRD client with empty store → verify event fallback still works
 *   5. getPayerPayments() returns full PaymentInfo[]
 *   6. FilePaymentStore: save → delete → re-recover from events
 *
 * Usage:
 *   PRIVATE_KEY=0x... pnpm tsx examples/e2e-test/payment-recovery.ts
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  type Address,
  type PublicClient,
  erc20Abi,
} from "viem";
import { baseSepolia } from "viem/chains";
import { mnemonicToAccount, privateKeyToAccount, generateMnemonic } from "viem/accounts";
import { english } from "viem/accounts";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
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
  MemoryPaymentStore,
  FilePaymentStore,
  type PaymentInfo,
} from "../../packages/core/dist/index.js";
import { X402rClient } from "../../packages/client/dist/index.js";
import { X402rMerchant } from "../../packages/merchant/dist/index.js";

// ============ Configuration ============

const NETWORK_ID = process.env.NETWORK_ID ?? "eip155:84532";
const RPC_URL = process.env.RPC_URL ?? "https://sepolia.base.org";
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;
const PAYMENT_AMOUNT = 10000n; // 0.01 USDC
const GAS_FUNDING = 10000000000000n;

// ============ Helpers ============

let passed = 0;
let failed = 0;

function log(msg: string) {
  console.log(`  ${msg}`);
}

function step(name: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`STEP: ${name}`);
  console.log("=".repeat(60));
}

function pass(name: string) {
  console.log(`  ✓ PASS: ${name}`);
  passed++;
}

function fail(name: string, error: string) {
  console.log(`  ✗ FAIL: ${name}`);
  console.log(`    error: ${error}`);
  failed++;
}

function assert(condition: boolean, name: string, errorMsg?: string) {
  if (condition) {
    pass(name);
  } else {
    fail(name, errorMsg ?? "Assertion failed");
  }
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
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║    x402r E2E: PaymentInfo Recovery After Restart       ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY environment variable required");
    process.exit(1);
  }

  // ---- Setup ----
  step("1. Setup Accounts");

  const mnemonic = generateMnemonic(english);
  const payerAccount = privateKeyToAccount(privateKey);
  const merchantAccount = mnemonicToAccount(mnemonic, { addressIndex: 0 });

  log(`Payer:    ${payerAccount.address}`);
  log(`Merchant: ${merchantAccount.address}`);

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

  // Balance checks
  const ethBalance = await publicClient.getBalance({ address: payerAccount.address });
  const usdcBalance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [payerAccount.address],
  });
  log(`ETH: ${(Number(ethBalance) / 1e18).toFixed(6)}, USDC: ${formatUnits(usdcBalance, 6)}`);

  if (ethBalance < GAS_FUNDING * 3n || usdcBalance < PAYMENT_AMOUNT) {
    console.error("Insufficient balance");
    process.exit(1);
  }

  const networkConfig = getNetworkConfig(NETWORK_ID);
  const addresses = resolveAddresses(NETWORK_ID);

  // ---- Deploy operator ----
  step("2. Deploy Operator");

  const deployStartBlock = await publicClient.getBlockNumber();

  const deployResult = await deployMarketplaceOperator(payerWallet, publicClient, NETWORK_ID, {
    feeRecipient: payerAccount.address,
    arbiter: payerAccount.address,
    escrowPeriodSeconds: 604800n,
    freezeDurationSeconds: 259200n,
    operatorFeeBps: 100n,
  });

  log(`Operator: ${deployResult.operatorAddress}`);
  pass("Deploy operator");

  // ---- Authorize payment ----
  step("3. Authorize Payment");

  const now = BigInt(Math.floor(Date.now() / 1000));

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
    salt: BigInt(Date.now()),
  };

  const escrowNonce = computeEscrowNonce(
    paymentInfo,
    networkConfig.authCaptureEscrow as Address,
    84532,
  );

  const erc3009Signature = await signERC3009Authorization(payerWallet, USDC_ADDRESS, {
    from: payerAccount.address,
    to: networkConfig.tokenCollector as `0x${string}`,
    value: PAYMENT_AMOUNT,
    validAfter: 0n,
    validBefore: paymentInfo.preApprovalExpiry,
    nonce: escrowNonce,
  });

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

  const escrowHash = computePaymentInfoHash(
    paymentInfo,
    networkConfig.authCaptureEscrow as Address,
    84532,
  );
  log(`Payment hash: ${escrowHash.slice(0, 18)}...`);

  // Verify funds in escrow
  const escrowState = (await publicClient.readContract({
    address: networkConfig.authCaptureEscrow as Address,
    abi: AuthCaptureEscrowABI,
    functionName: "paymentState",
    args: [escrowHash],
  })) as [boolean, bigint, bigint];

  assert(escrowState[1] > 0n, "Funds in escrow after authorize");

  // ======================================================================
  // CORE TESTS: PaymentInfo Recovery
  // ======================================================================

  // ---- Test A: New client with NO store → recover from escrow events ----
  step("4. Recovery via Escrow Events (no store)");

  const clientNoStore = new X402rClient({
    publicClient,
    walletClient: payerWallet,
    operatorAddress: deployResult.operatorAddress as Address,
    escrowAddress: addresses.escrowAddress,
    refundRequestAddress: addresses.refundRequestAddress,
    chainId: addresses.chainId,
    // No paymentStore — pure event fallback
  });

  const recoveredFromEvents = await clientNoStore.getPaymentDetails(escrowHash, deployStartBlock);

  assert(
    recoveredFromEvents.operator.toLowerCase() === paymentInfo.operator.toLowerCase(),
    "Recovered operator matches",
  );
  assert(
    recoveredFromEvents.payer.toLowerCase() === paymentInfo.payer.toLowerCase(),
    "Recovered payer matches",
  );
  assert(
    recoveredFromEvents.receiver.toLowerCase() === paymentInfo.receiver.toLowerCase(),
    "Recovered receiver matches",
  );
  assert(recoveredFromEvents.maxAmount === paymentInfo.maxAmount, "Recovered maxAmount matches");
  assert(recoveredFromEvents.salt === paymentInfo.salt, "Recovered salt matches");
  assert(recoveredFromEvents.minFeeBps === paymentInfo.minFeeBps, "Recovered minFeeBps matches");
  assert(recoveredFromEvents.maxFeeBps === paymentInfo.maxFeeBps, "Recovered maxFeeBps matches");

  // ---- Test B: MemoryPaymentStore — cache-fill + instant lookup ----
  step("5. MemoryPaymentStore Cache-Fill");

  const memStore = new MemoryPaymentStore();

  const clientWithMemStore = new X402rClient({
    publicClient,
    walletClient: payerWallet,
    operatorAddress: deployResult.operatorAddress as Address,
    escrowAddress: addresses.escrowAddress,
    refundRequestAddress: addresses.refundRequestAddress,
    chainId: addresses.chainId,
    paymentStore: memStore,
  });

  // First call: should hit events, then cache-fill
  const recovered2 = await clientWithMemStore.getPaymentDetails(escrowHash, deployStartBlock);
  assert(recovered2.salt === paymentInfo.salt, "Event fallback → cache-fill works");

  // Verify it was saved to store
  const cached = await memStore.load(escrowHash);
  assert(cached !== null, "PaymentInfo saved to MemoryPaymentStore after event lookup");
  assert(cached!.salt === paymentInfo.salt, "Cached salt matches original");

  // Second call: should come from store (no RPC needed)
  // We can't easily verify it didn't hit RPC, but let's confirm it returns correctly
  const fromCache = await clientWithMemStore.getPaymentDetails(escrowHash, deployStartBlock);
  assert(fromCache.salt === paymentInfo.salt, "Subsequent lookup from cache returns correct data");

  // ---- Test C: getPayerPayments() returns full PaymentInfo ----
  step("6. getPayerPayments() Returns Full PaymentInfo");

  const payments = await clientWithMemStore.getPayerPayments(deployStartBlock);
  assert(payments.length > 0, "getPayerPayments returns at least 1 payment");
  assert(payments[0].hash === escrowHash, "First payment hash matches");
  assert(
    payments[0].paymentInfo.salt === paymentInfo.salt,
    "First payment PaymentInfo.salt matches",
  );
  assert(
    payments[0].paymentInfo.payer.toLowerCase() === payerAccount.address.toLowerCase(),
    "First payment payer matches wallet",
  );

  // ---- Test D: FilePaymentStore — persist, delete, re-recover ----
  step("7. FilePaymentStore Persistence & Recovery");

  const tmpDir = mkdtempSync(join(tmpdir(), "x402r-e2e-"));
  log(`Temp dir: ${tmpDir}`);

  try {
    const fileStore = new FilePaymentStore(tmpDir);

    const clientWithFileStore = new X402rClient({
      publicClient,
      walletClient: payerWallet,
      operatorAddress: deployResult.operatorAddress as Address,
      escrowAddress: addresses.escrowAddress,
      refundRequestAddress: addresses.refundRequestAddress,
      chainId: addresses.chainId,
      paymentStore: fileStore,
    });

    // First call: populate file store from events
    const fromFile1 = await clientWithFileStore.getPaymentDetails(escrowHash, deployStartBlock);
    assert(fromFile1.salt === paymentInfo.salt, "FilePaymentStore: event fallback works");

    // Verify file exists
    const filePath = join(tmpDir, `${escrowHash}.json`);
    assert(existsSync(filePath), "FilePaymentStore: JSON file created on disk");

    // New FilePaymentStore instance (simulates restart) — should load from file
    const fileStore2 = new FilePaymentStore(tmpDir);
    const fromFile2 = await fileStore2.load(escrowHash);
    assert(fromFile2 !== null, "FilePaymentStore: survives new instance (simulated restart)");
    assert(fromFile2!.salt === paymentInfo.salt, "FilePaymentStore: persisted data matches");

    // Delete the cache directory (simulates disk wipe)
    rmSync(tmpDir, { recursive: true, force: true });
    assert(!existsSync(filePath), "FilePaymentStore: cache directory deleted");

    // New store pointing to wiped directory + new client
    const fileStore3 = new FilePaymentStore(tmpDir);
    const clientAfterWipe = new X402rClient({
      publicClient,
      walletClient: payerWallet,
      operatorAddress: deployResult.operatorAddress as Address,
      escrowAddress: addresses.escrowAddress,
      refundRequestAddress: addresses.refundRequestAddress,
      chainId: addresses.chainId,
      paymentStore: fileStore3,
    });

    // Should recover from events again since cache was wiped
    const fromFile3 = await clientAfterWipe.getPaymentDetails(escrowHash, deployStartBlock);
    assert(
      fromFile3.salt === paymentInfo.salt,
      "FilePaymentStore: re-recovers after disk wipe via events",
    );

    // And the file should be re-created
    assert(existsSync(filePath), "FilePaymentStore: file re-created after recovery");
  } finally {
    // Cleanup
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // ---- Test E: Merchant getReceiverPayments + getPaymentDetails ----
  step("8. Merchant: getReceiverPayments + getPaymentDetails");

  const merchant = new X402rMerchant({
    publicClient,
    walletClient: merchantWallet,
    operatorAddress: deployResult.operatorAddress as Address,
    escrowAddress: addresses.escrowAddress,
    refundRequestAddress: addresses.refundRequestAddress,
    chainId: addresses.chainId,
  });

  // getReceiverPayments now returns full PaymentInfo
  const receiverPayments = await merchant.getReceiverPayments(deployStartBlock);
  assert(receiverPayments.length > 0, "Merchant: getReceiverPayments returns payments");
  assert(
    receiverPayments[0].paymentInfo.salt === paymentInfo.salt,
    "Merchant: recovered PaymentInfo.salt matches",
  );
  assert(
    receiverPayments[0].paymentInfo.receiver.toLowerCase() ===
      merchantAccount.address.toLowerCase(),
    "Merchant: receiver matches merchant wallet",
  );

  // Merchant can also call getPaymentDetails directly
  const merchantDetails = await merchant.getPaymentDetails(escrowHash, deployStartBlock);
  assert(
    merchantDetails.maxAmount === paymentInfo.maxAmount,
    "Merchant: getPaymentDetails returns correct maxAmount",
  );

  // ============ Summary ============
  console.log(`\n${"=".repeat(60)}`);
  console.log("RESULTS");
  console.log("=".repeat(60));
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);

  if (failed > 0) {
    console.log("\n  ✗ SOME TESTS FAILED");
    process.exit(1);
  } else {
    console.log("\n  ✓ ALL TESTS PASSED");
  }
}

main().catch(err => {
  console.error("\n  FATAL ERROR:", err.message);
  process.exit(1);
});
