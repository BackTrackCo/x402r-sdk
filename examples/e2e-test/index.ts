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
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  formatUnits,
  encodeAbiParameters,
  keccak256,
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
  toAbiPaymentInfo,
  PaymentOperatorABI,
  AuthCaptureEscrowABI,
  RequestStatus,
  type PaymentInfo,
} from "../../packages/core/dist/index.js";
import { X402rClient } from "../../packages/client/dist/index.js";
import { X402rArbiter } from "../../packages/arbiter/dist/index.js";
import { X402rMerchant } from "../../packages/merchant/dist/index.js";

// ============ Configuration ============

const NETWORK_ID = process.env.NETWORK_ID ?? "eip155:84532";
const RPC_URL = process.env.RPC_URL ?? "https://sepolia.base.org";
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;
const PAYMENT_AMOUNT = 10000n; // 0.01 USDC (6 decimals)
const GAS_FUNDING = 30000000000000n; // 0.00003 ETH per derived account (Base Sepolia gas is cheap)

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
  console.log(`  ✓ PASS: ${name}`);
  if (txHash) console.log(`    tx: ${SCANNER}/tx/${txHash}`);
  results.push({ name, pass: true, txHash });
}

function fail(name: string, error: string) {
  console.log(`  ✗ FAIL: ${name}`);
  console.log(`    error: ${error}`);
  results.push({ name, pass: false, error });
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForTx(publicClient: PublicClient, hash: `0x${string}`) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
  if (receipt.status !== "success") {
    throw new Error(`Transaction reverted: ${hash}`);
  }
  // Small delay to allow RPC state propagation
  await sleep(2000);
  return receipt;
}

// ============ Main ============

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║       x402r E2E Integration Test — Base Sepolia        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  // ---- Step 1: Setup accounts ----
  step("1. Setup Accounts & Clients");

  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error("Error: PRIVATE_KEY environment variable is required");
    console.error("Usage: PRIVATE_KEY=0x... pnpm example:e2e-test");
    process.exit(1);
  }

  // Generate a fresh mnemonic for merchant and arbiter (throwaway accounts)
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
  log(`  Funded merchant: ${SCANNER}/tx/${fundMerchantTx}`);

  log("Funding arbiter with ETH for gas...");
  const fundArbiterTx = await payerWallet.sendTransaction({
    to: arbiterAccount.address,
    value: GAS_FUNDING,
    chain: baseSepolia,
    account: payerAccount,
  });
  await waitForTx(publicClient, fundArbiterTx);
  log(`  Funded arbiter: ${SCANNER}/tx/${fundArbiterTx}`);

  pass("Setup accounts and fund derived wallets");

  // Get network config
  const networkConfig = getNetworkConfig(NETWORK_ID);
  log(`Network: ${networkConfig.name} (${NETWORK_ID})`);
  log(`AuthCaptureEscrow: ${shortAddr(networkConfig.authCaptureEscrow)}`);
  log(`TokenCollector: ${shortAddr(networkConfig.tokenCollector)}`);
  log(`RefundRequest: ${shortAddr(networkConfig.refundRequest)}`);

  // ---- Step 2: Deploy Operator ----
  step("2. Deploy Marketplace Operator");

  const deployOptions = {
    feeRecipient: payerAccount.address,
    arbiter: arbiterAccount.address,
    escrowPeriodSeconds: 604800n, // 7 days
    freezeDurationSeconds: 259200n, // 3 days
    operatorFeeBps: 100n, // 1%
  };

  log(`Arbiter: ${arbiterAccount.address}`);
  log(`Escrow period: 7 days, Freeze duration: 3 days`);

  const deployResult = await deployMarketplaceOperator(
    payerWallet,
    publicClient,
    NETWORK_ID,
    deployOptions,
  );

  log(`Operator: ${deployResult.operatorAddress}`);
  log(`EscrowPeriod: ${deployResult.escrowPeriodAddress}`);
  log(`Freeze: ${deployResult.freezeAddress}`);
  log(`New deployments: ${deployResult.summary.newDeployments}`);
  log(`Already existed: ${deployResult.summary.existingContracts}`);

  for (const hash of deployResult.txHashes) {
    log(`  tx: ${SCANNER}/tx/${hash}`);
  }

  pass("Deploy operator", deployResult.txHashes[0]);

  // ---- Step 3: Construct PaymentInfo ----
  step("3. Construct PaymentInfo");

  const now = BigInt(Math.floor(Date.now() / 1000));
  const salt = BigInt(Date.now()); // unique salt

  const paymentInfo: PaymentInfo = {
    operator: deployResult.operatorAddress as Address,
    payer: payerAccount.address,
    receiver: merchantAccount.address,
    token: USDC_ADDRESS,
    maxAmount: PAYMENT_AMOUNT,
    preApprovalExpiry: now + 3600n, // +1h (used as ERC-3009 validBefore)
    authorizationExpiry: now + 3600n, // +1 hour
    refundExpiry: now + 864000n, // +10 days
    minFeeBps: 0,
    maxFeeBps: 10000,
    feeReceiver: deployResult.operatorAddress as Address, // Must be the operator contract itself
    salt,
  };

  log(`Operator: ${shortAddr(paymentInfo.operator)}`);
  log(`Payer: ${shortAddr(paymentInfo.payer)}`);
  log(`Receiver: ${shortAddr(paymentInfo.receiver)}`);
  log(`Token: ${shortAddr(paymentInfo.token)} (USDC)`);
  log(`Amount: ${formatUnits(paymentInfo.maxAmount, 6)} USDC`);
  log(`Auth expiry: ${new Date(Number(paymentInfo.authorizationExpiry) * 1000).toISOString()}`);
  log(`Refund expiry: ${new Date(Number(paymentInfo.refundExpiry) * 1000).toISOString()}`);
  log(`Salt: ${paymentInfo.salt}`);

  pass("Construct PaymentInfo");

  // ---- Step 4: Authorize Payment ----
  step("4. Payer Authorizes Payment");

  // ERC-3009: Compute escrow nonce (must match AuthCaptureEscrow.getHash with payer=0x0)
  const PAYMENT_INFO_TYPEHASH = keccak256(
    new TextEncoder().encode(
      "PaymentInfo(address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt)",
    ),
  );
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

  const paymentInfoEncoded = encodeAbiParameters(
    [
      { name: "typehash", type: "bytes32" },
      { name: "operator", type: "address" },
      { name: "payer", type: "address" },
      { name: "receiver", type: "address" },
      { name: "token", type: "address" },
      { name: "maxAmount", type: "uint120" },
      { name: "preApprovalExpiry", type: "uint48" },
      { name: "authorizationExpiry", type: "uint48" },
      { name: "refundExpiry", type: "uint48" },
      { name: "minFeeBps", type: "uint16" },
      { name: "maxFeeBps", type: "uint16" },
      { name: "feeReceiver", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    [
      PAYMENT_INFO_TYPEHASH,
      paymentInfo.operator,
      ZERO_ADDRESS, // payer-agnostic nonce
      paymentInfo.receiver,
      paymentInfo.token,
      paymentInfo.maxAmount,
      paymentInfo.preApprovalExpiry,
      paymentInfo.authorizationExpiry,
      paymentInfo.refundExpiry,
      paymentInfo.minFeeBps,
      paymentInfo.maxFeeBps,
      paymentInfo.feeReceiver,
      paymentInfo.salt,
    ],
  );
  const paymentInfoHash = keccak256(paymentInfoEncoded);

  const escrowNonce = keccak256(
    encodeAbiParameters(
      [
        { name: "chainId", type: "uint256" },
        { name: "escrow", type: "address" },
        { name: "paymentInfoHash", type: "bytes32" },
      ],
      [BigInt(84532), networkConfig.authCaptureEscrow as Address, paymentInfoHash],
    ),
  );

  log(`Escrow nonce: ${escrowNonce.slice(0, 18)}...`);

  // Sign ERC-3009 ReceiveWithAuthorization
  log("Signing ERC-3009 ReceiveWithAuthorization...");
  const erc3009Signature = await payerWallet.signTypedData({
    account: payerAccount,
    domain: {
      name: "USDC",
      version: "2",
      chainId: 84532,
      verifyingContract: USDC_ADDRESS,
    },
    types: {
      ReceiveWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "ReceiveWithAuthorization",
    message: {
      from: payerAccount.address,
      to: networkConfig.tokenCollector,
      value: PAYMENT_AMOUNT,
      validAfter: 0n,
      validBefore: paymentInfo.preApprovalExpiry,
      nonce: escrowNonce,
    },
  });
  log("  ERC-3009 signature obtained");

  // Call authorize on the operator with the signature as collectorData
  log("Calling operator.authorize()...");
  const authorizeTx = await payerWallet.writeContract({
    address: deployResult.operatorAddress as Address,
    abi: PaymentOperatorABI,
    functionName: "authorize",
    args: [
      toAbiPaymentInfo(paymentInfo),
      PAYMENT_AMOUNT,
      networkConfig.tokenCollector,
      erc3009Signature, // Raw ERC-3009 signature as collectorData
    ],
    chain: baseSepolia,
    account: payerAccount,
  });
  await waitForTx(publicClient, authorizeTx);
  log(`  Authorize tx: ${SCANNER}/tx/${authorizeTx}`);

  // Verify escrow state
  const escrowHash = await publicClient.readContract({
    address: networkConfig.authCaptureEscrow as Address,
    abi: AuthCaptureEscrowABI,
    functionName: "getHash",
    args: [toAbiPaymentInfo(paymentInfo)],
  });

  const escrowState = await publicClient.readContract({
    address: networkConfig.authCaptureEscrow as Address,
    abi: AuthCaptureEscrowABI,
    functionName: "paymentState",
    args: [escrowHash as `0x${string}`],
  });

  const [hasCollected, capturableAmount, refundableAmount] = escrowState as [
    boolean,
    bigint,
    bigint,
  ];
  log(
    `Escrow state: hasCollected=${hasCollected}, capturable=${capturableAmount}, refundable=${refundableAmount}`,
  );

  if (capturableAmount > 0n) {
    pass("Authorize payment (USDC in escrow)", authorizeTx);
  } else {
    fail("Authorize payment", "capturableAmount is 0 after authorize");
  }

  // ---- Step 5: Payer Requests Refund ----
  step("5. Payer Requests Refund");

  const client = new X402rClient({
    publicClient,
    walletClient: payerWallet,
    operatorAddress: deployResult.operatorAddress as Address,
    escrowAddress: networkConfig.authCaptureEscrow as Address,
    refundRequestAddress: networkConfig.refundRequest as Address,
    refundRequestEvidenceAddress: networkConfig.refundRequestEvidence as Address,
    chainId: 84532,
  });

  log("Submitting refund request...");
  const { txHash: refundReqTx } = await client.requestRefund(paymentInfo, PAYMENT_AMOUNT, 0n);
  await waitForTx(publicClient, refundReqTx);
  log(`  Refund request tx: ${SCANNER}/tx/${refundReqTx}`);

  // Verify status
  const refundStatus = await client.getRefundStatus(paymentInfo, 0n);
  log(`Refund status: ${refundStatus} (expected ${RequestStatus.Pending} = Pending)`);

  if (refundStatus === RequestStatus.Pending) {
    pass("Request refund (status = Pending)", refundReqTx);
  } else {
    fail("Request refund", `Expected Pending (${RequestStatus.Pending}), got ${refundStatus}`);
  }

  // ---- Step 6: Payer Freezes Payment ----
  step("6. Payer Freezes Payment");

  log("Freezing payment...");
  const { txHash: freezeTx } = await client.freezePayment(
    paymentInfo,
    deployResult.freezeAddress as Address,
  );
  await waitForTx(publicClient, freezeTx);
  log(`  Freeze tx: ${SCANNER}/tx/${freezeTx}`);

  // Verify frozen
  const frozen = await client.isFrozen(paymentInfo, deployResult.freezeAddress as Address);
  log(`Is frozen: ${frozen}`);

  if (frozen) {
    pass("Freeze payment (isFrozen = true)", freezeTx);
  } else {
    fail("Freeze payment", "isFrozen returned false after freeze");
  }

  // ---- Step 7: Payer Submits Evidence ----
  step("7. Payer Submits Evidence");

  log("Submitting payer evidence...");
  const { txHash: payerEvidenceTx } = await client.submitEvidence(
    paymentInfo,
    0n,
    "QmPayerEvidenceCID_RefundJustification",
  );
  await waitForTx(publicClient, payerEvidenceTx);
  log(`  Payer evidence tx: ${SCANNER}/tx/${payerEvidenceTx}`);

  const evidenceCount1 = await client.getEvidenceCount(paymentInfo, 0n);
  log(`Evidence count: ${evidenceCount1} (expected 1)`);

  if (evidenceCount1 === 1n) {
    pass("Payer submits evidence (count = 1)", payerEvidenceTx);
  } else {
    fail("Payer submits evidence", `Expected count 1, got ${evidenceCount1}`);
  }

  // ---- Step 8: Merchant Submits Counter-Evidence ----
  step("8. Merchant Submits Counter-Evidence");

  const merchant = new X402rMerchant({
    publicClient,
    walletClient: merchantWallet,
    operatorAddress: deployResult.operatorAddress as Address,
    escrowAddress: networkConfig.authCaptureEscrow as Address,
    refundRequestAddress: networkConfig.refundRequest as Address,
    refundRequestEvidenceAddress: networkConfig.refundRequestEvidence as Address,
  });

  log("Submitting merchant counter-evidence...");
  const { txHash: merchantEvidenceTx } = await merchant.submitEvidence(
    paymentInfo,
    0n,
    "QmMerchantEvidenceCID_ServiceDelivered",
  );
  await waitForTx(publicClient, merchantEvidenceTx);
  log(`  Merchant evidence tx: ${SCANNER}/tx/${merchantEvidenceTx}`);

  const evidenceCount2 = await client.getEvidenceCount(paymentInfo, 0n);
  log(`Evidence count: ${evidenceCount2} (expected 2)`);

  if (evidenceCount2 === 2n) {
    pass("Merchant submits counter-evidence (count = 2)", merchantEvidenceTx);
  } else {
    fail("Merchant submits counter-evidence", `Expected count 2, got ${evidenceCount2}`);
  }

  // ---- Step 9: Arbiter Reads All Evidence ----
  step("9. Arbiter Reads All Evidence");

  const arbiter = new X402rArbiter({
    publicClient,
    walletClient: arbiterWallet,
    operatorAddress: deployResult.operatorAddress as Address,
    escrowAddress: networkConfig.authCaptureEscrow as Address,
    refundRequestAddress: networkConfig.refundRequest as Address,
    refundRequestEvidenceAddress: networkConfig.refundRequestEvidence as Address,
    arbiterRegistryAddress: networkConfig.arbiterRegistry as Address,
    chainId: 84532,
  });

  const allEvidence = await arbiter.getAllEvidence(paymentInfo, 0n);
  log(`Evidence entries: ${allEvidence.length}`);

  for (let i = 0; i < allEvidence.length; i++) {
    const e = allEvidence[i];
    const roleName = e.role === 0 ? "Payer" : e.role === 1 ? "Receiver" : "Arbiter";
    const ts = new Date(Number(e.timestamp) * 1000).toISOString();
    log(`  [${i}] ${roleName} ${shortAddr(e.submitter)} | ${ts} | CID: ${e.cid}`);
  }

  if (
    allEvidence.length === 2 &&
    allEvidence[0].cid === "QmPayerEvidenceCID_RefundJustification" &&
    allEvidence[1].cid === "QmMerchantEvidenceCID_ServiceDelivered" &&
    allEvidence[0].role === 0 && // Payer
    allEvidence[1].role === 1 // Receiver
  ) {
    pass("Arbiter reads all evidence (2 entries, correct roles and CIDs)");
  } else {
    fail(
      "Arbiter reads all evidence",
      `Expected 2 entries with correct data, got ${allEvidence.length}`,
    );
  }

  // ---- Step 10: Arbiter Approves Refund ----
  step("10. Arbiter Approves Refund (based on evidence review)");

  log("Approving refund request...");
  const { txHash: approveTxHash } = await arbiter.approveRefundRequest(paymentInfo, 0n);
  await waitForTx(publicClient, approveTxHash);
  log(`  Approve tx: ${SCANNER}/tx/${approveTxHash}`);

  // Verify status
  const approvedStatus = await arbiter.getRefundStatus(paymentInfo, 0n);
  log(`Refund status: ${approvedStatus} (expected ${RequestStatus.Approved} = Approved)`);

  if (approvedStatus === RequestStatus.Approved) {
    pass("Arbiter approve refund (status = Approved)", approveTxHash);
  } else {
    fail(
      "Arbiter approve refund",
      `Expected Approved (${RequestStatus.Approved}), got ${approvedStatus}`,
    );
  }

  // ---- Step 11: Arbiter Executes Refund ----
  step("11. Arbiter Executes Refund");

  // Check payer USDC balance before
  const payerUsdcBefore = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [payerAccount.address],
  });

  log("Executing refund in escrow...");
  const { txHash: executeTx } = await arbiter.executeRefundInEscrow(paymentInfo, PAYMENT_AMOUNT);
  await waitForTx(publicClient, executeTx);
  log(`  Execute tx: ${SCANNER}/tx/${executeTx}`);

  // Verify escrow emptied
  const escrowStateAfter = await publicClient.readContract({
    address: networkConfig.authCaptureEscrow as Address,
    abi: AuthCaptureEscrowABI,
    functionName: "paymentState",
    args: [escrowHash as `0x${string}`],
  });

  const [, capturableAfter, refundableAfter] = escrowStateAfter as [boolean, bigint, bigint];
  log(`Escrow after: capturable=${capturableAfter}, refundable=${refundableAfter}`);

  // Check payer USDC balance after
  const payerUsdcAfter = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [payerAccount.address],
  });

  const usdcRecovered = payerUsdcAfter - payerUsdcBefore;
  log(`Payer USDC recovered: ${formatUnits(usdcRecovered, 6)} USDC`);

  if (capturableAfter === 0n && usdcRecovered > 0n) {
    pass("Execute refund (escrow emptied, USDC returned to payer)", executeTx);
  } else {
    fail(
      "Execute refund",
      `capturable=${capturableAfter} (expected 0), recovered=${usdcRecovered} (expected > 0)`,
    );
  }

  // ---- Step 12: Final Verification ----
  step("12. Final Verification");

  // Evidence should still be queryable after refund execution
  const finalEvidenceCount = await arbiter.getEvidenceCount(paymentInfo, 0n);
  log(`Evidence still queryable: ${finalEvidenceCount} entries`);

  const finalRefundStatus = await arbiter.getRefundStatus(paymentInfo, 0n);
  log(`Final refund status: ${finalRefundStatus}`);

  if (finalEvidenceCount === 2n && capturableAfter === 0n && usdcRecovered > 0n) {
    pass("Final verification (evidence persists, escrow emptied, USDC returned)");
  } else {
    fail(
      "Final verification",
      `evidence=${finalEvidenceCount} (expected 2), capturable=${capturableAfter} (expected 0), recovered=${usdcRecovered} (expected > 0)`,
    );
  }

  // ---- Summary ----
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                    TEST SUMMARY                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  for (const r of results) {
    const icon = r.pass ? "✓" : "✗";
    console.log(`  ${icon} ${r.name}`);
    if (r.txHash) console.log(`    ${SCANNER}/tx/${r.txHash}`);
    if (r.error) console.log(`    ERROR: ${r.error}`);
  }

  console.log(`\n  Result: ${passed} passed, ${failed} failed out of ${results.length} steps`);

  if (failed > 0) {
    console.log("\n  ✗ E2E TEST FAILED");
    process.exit(1);
  } else {
    console.log("\n  ✓ E2E TEST PASSED — Full payment lifecycle verified on-chain");
  }
}

main().catch(error => {
  console.error("\nE2E test failed with error:", error);
  process.exit(1);
});
