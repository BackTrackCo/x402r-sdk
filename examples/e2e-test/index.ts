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
  publicActions,
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
  computePaymentInfoHash,
  AuthCaptureEscrowABI,
  RequestStatus,
  PaymentState,
  type PaymentInfo,
} from "../../packages/core/dist/index.js";
import { X402rClient } from "../../packages/client/dist/index.js";
import { X402rArbiter } from "../../packages/arbiter/dist/index.js";
import { X402rMerchant } from "../../packages/merchant/dist/index.js";
import { refundable } from "@x402r/helpers";
import { x402Client } from "@x402/core/client";
import { x402Facilitator } from "@x402/core/facilitator";
import {
  x402ResourceServer,
  x402HTTPResourceServer,
  type FacilitatorClient,
  type HTTPResponseInstructions,
} from "@x402/core/server";
import type {
  PaymentPayload,
  PaymentRequirements,
  VerifyResponse,
  SettleResponse,
  SupportedResponse,
} from "@x402/core/types";
import { x402HTTPClient } from "@x402/core/http";
import { toFacilitatorEvmSigner } from "@x402/evm";
import { registerEscrowScheme as registerEscrowClientScheme } from "@x402r/evm/escrow/client";
import { registerEscrowScheme as registerEscrowFacilitatorScheme } from "@x402r/evm/escrow/facilitator";
import { registerEscrowServerScheme } from "@x402r/evm/escrow/server";
import type { EscrowPayload } from "@x402r/evm/escrow/types";

function isEscrowPayload(value: unknown): value is EscrowPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "authorization" in value &&
    "signature" in value &&
    "paymentInfo" in value
  );
}

// ============ Configuration ============

const NETWORK_ID = process.env.NETWORK_ID ?? "eip155:84532";
const RPC_URL = process.env.RPC_URL ?? "https://sepolia.base.org";
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;
const PAYMENT_AMOUNT = 10000n; // 0.01 USDC (6 decimals)
const GAS_FUNDING = 10000000000000n; // 0.00001 ETH per derived account (Base Sepolia gas is cheap)

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

  // Get network config and resolved addresses for SDK construction
  const networkConfig = getNetworkConfig(NETWORK_ID);
  const addresses = resolveAddresses(NETWORK_ID);
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

  // Capture block number before deploy for event log scanning
  const deployStartBlock = await publicClient.getBlockNumber();

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

  // ---- Step 3: Setup HTTP 402 Infrastructure ----
  step("3. Setup HTTP 402 Infrastructure (in-process)");

  // 3a: Facilitator — in-process (no HTTP server)
  const facilitatorViemClient = createWalletClient({
    account: payerAccount, // Use payer as facilitator for E2E (has ETH for gas)
    chain: baseSepolia,
    transport: http(RPC_URL),
  }).extend(publicActions);

  const evmSigner = toFacilitatorEvmSigner({
    getCode: (args: { address: `0x${string}` }) => facilitatorViemClient.getCode(args),
    address: payerAccount.address,
    readContract: (args: {
      address: `0x${string}`;
      abi: readonly unknown[];
      functionName: string;
      args?: readonly unknown[];
    }) => facilitatorViemClient.readContract({ ...args, args: args.args || [] }),
    verifyTypedData: (args: {
      address: `0x${string}`;
      domain: Record<string, unknown>;
      types: Record<string, unknown>;
      primaryType: string;
      message: Record<string, unknown>;
      signature: `0x${string}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) => facilitatorViemClient.verifyTypedData(args as any),
    writeContract: (args: {
      address: `0x${string}`;
      abi: readonly unknown[];
      functionName: string;
      args: readonly unknown[];
    }) => facilitatorViemClient.writeContract({ ...args, args: args.args || [] }),
    sendTransaction: (args: { to: `0x${string}`; data: `0x${string}` }) =>
      facilitatorViemClient.sendTransaction(args),
    waitForTransactionReceipt: (args: { hash: `0x${string}` }) =>
      facilitatorViemClient.waitForTransactionReceipt(args),
  });

  const facilitator = new x402Facilitator();
  registerEscrowFacilitatorScheme(facilitator, {
    signer: evmSigner,
    networks: NETWORK_ID,
  });

  // InProcessFacilitatorClient — follows CashFacilitatorClient pattern
  class InProcessFacilitatorClient implements FacilitatorClient {
    constructor(private readonly fac: x402Facilitator) {}
    verify(p: PaymentPayload, r: PaymentRequirements): Promise<VerifyResponse> {
      return this.fac.verify(p, r);
    }
    settle(p: PaymentPayload, r: PaymentRequirements): Promise<SettleResponse> {
      return this.fac.settle(p, r);
    }
    getSupported(): Promise<SupportedResponse> {
      return Promise.resolve(this.fac.getSupported());
    }
  }

  const facilitatorClient = new InProcessFacilitatorClient(facilitator);

  // 3b: Resource server with escrow scheme
  const resourceServer = new x402ResourceServer(facilitatorClient);
  registerEscrowServerScheme(resourceServer, { networks: NETWORK_ID });
  await resourceServer.initialize();

  // 3c: HTTP server with refundable route
  const routes = {
    "/api/weather": {
      accepts: refundable(
        {
          scheme: "escrow",
          network: NETWORK_ID,
          payTo: merchantAccount.address,
          price: "$0.01",
        },
        deployResult.operatorAddress as `0x${string}`,
        { maxFeeBps: 10000 },
      ),
      description: "Weather API (E2E test)",
      mimeType: "application/json",
    },
  };
  const httpServer = new x402HTTPResourceServer(resourceServer, routes);
  await httpServer.initialize();

  // 3d: Client with escrow scheme
  const paymentClient = new x402Client();
  registerEscrowClientScheme(paymentClient, {
    signer: payerAccount,
    networks: NETWORK_ID,
  });
  const httpClient = new x402HTTPClient(paymentClient);

  log("Facilitator: in-process (payer account as signer)");
  log("Server: x402HTTPResourceServer with escrow route at /api/weather");
  log("Client: x402HTTPClient with escrow scheme");
  pass("Setup HTTP 402 infrastructure");

  // ---- Step 4: HTTP 402 Flow — Authorize via Protocol ----
  step("4. HTTP 402 Flow (402 → Pay → Verify → Settle)");

  // 4A: Unpaid request → 402
  log("4A: Sending unpaid request...");
  const unpaidContext = {
    adapter: {
      getHeader: (_name: string) => undefined,
      getMethod: () => "GET",
      getPath: () => "/api/weather",
      getUrl: () => "https://e2e-test.local/api/weather",
      getAcceptHeader: () => "application/json",
      getUserAgent: () => "x402r-e2e/1.0",
    },
    path: "/api/weather",
    method: "GET",
  };

  const unpaidResult = await httpServer.processHTTPRequest(unpaidContext);
  if (unpaidResult.type !== "payment-error") {
    throw new Error(`Expected payment-error, got ${unpaidResult.type}`);
  }
  const initial402 = (unpaidResult as { type: "payment-error"; response: HTTPResponseInstructions })
    .response;
  if (initial402.status !== 402) {
    throw new Error(`Expected 402 status, got ${initial402.status}`);
  }
  log(`  Got 402 response with PAYMENT-REQUIRED header`);
  pass("4A: Unpaid request returns 402");

  // 4B: Client parses 402 and creates payment payload
  log("4B: Client creating payment payload...");
  const paymentRequired = httpClient.getPaymentRequiredResponse(
    name => initial402.headers[name],
    initial402.body,
  );
  const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);
  const requestHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);
  log(`  Payment payload created (scheme: ${paymentPayload.accepted?.scheme})`);
  pass("4B: Client creates payment payload from 402");

  // 4C: Paid request → verify
  log("4C: Sending paid request...");
  const paidContext = {
    adapter: {
      getHeader: (name: string) =>
        requestHeaders[name] ?? requestHeaders[name.toUpperCase()] ?? undefined,
      getMethod: () => "GET",
      getPath: () => "/api/weather",
      getUrl: () => "https://e2e-test.local/api/weather",
      getAcceptHeader: () => "application/json",
      getUserAgent: () => "x402r-e2e/1.0",
    },
    path: "/api/weather",
    method: "GET",
  };

  const paidResult = await httpServer.processHTTPRequest(paidContext);
  if (paidResult.type !== "payment-verified") {
    const errMsg =
      paidResult.type === "payment-error"
        ? JSON.stringify((paidResult as { response: HTTPResponseInstructions }).response)
        : paidResult.type;
    throw new Error(`Expected payment-verified, got: ${errMsg}`);
  }
  log(`  Payment verified (payer confirmed by facilitator)`);
  pass("4C: Paid request verified");

  const { paymentPayload: verifiedPayload, paymentRequirements: verifiedRequirements } =
    paidResult as {
      type: "payment-verified";
      paymentPayload: PaymentPayload;
      paymentRequirements: PaymentRequirements;
    };

  // 4D: Settle on-chain
  log("4D: Settling payment on-chain...");
  const settlementResult = await httpServer.processSettlement(
    verifiedPayload,
    verifiedRequirements,
  );
  if (!settlementResult.success) {
    throw new Error(`Settlement failed: ${settlementResult.errorReason}`);
  }
  const settleTxHash = settlementResult.transaction;
  log(`  Settlement tx: ${SCANNER}/tx/${settleTxHash}`);
  await waitForTx(publicClient, settleTxHash as `0x${string}`);
  pass("4D: On-chain settlement", settleTxHash);

  // 4E: Extract PaymentInfo from EscrowPayload for subsequent steps
  log("4E: Extracting PaymentInfo from EscrowPayload...");
  if (!isEscrowPayload(verifiedPayload.payload)) {
    throw new Error("Verified payload is not an EscrowPayload");
  }
  const escrowPayload = verifiedPayload.payload as EscrowPayload;
  const paymentInfo: PaymentInfo = {
    operator: escrowPayload.paymentInfo.operator,
    payer: escrowPayload.authorization.from,
    receiver: escrowPayload.paymentInfo.receiver,
    token: escrowPayload.paymentInfo.token,
    maxAmount: BigInt(escrowPayload.paymentInfo.maxAmount),
    preApprovalExpiry: BigInt(escrowPayload.paymentInfo.preApprovalExpiry),
    authorizationExpiry: BigInt(escrowPayload.paymentInfo.authorizationExpiry),
    refundExpiry: BigInt(escrowPayload.paymentInfo.refundExpiry),
    minFeeBps: escrowPayload.paymentInfo.minFeeBps,
    maxFeeBps: escrowPayload.paymentInfo.maxFeeBps,
    feeReceiver: escrowPayload.paymentInfo.feeReceiver,
    salt: BigInt(escrowPayload.paymentInfo.salt),
  };
  log(`  PaymentInfo extracted (operator: ${shortAddr(paymentInfo.operator)})`);

  // Verify escrow state
  const escrowHash = computePaymentInfoHash(
    paymentInfo,
    networkConfig.authCaptureEscrow as Address,
    84532,
  );

  const escrowState = await publicClient.readContract({
    address: networkConfig.authCaptureEscrow as Address,
    abi: AuthCaptureEscrowABI,
    functionName: "paymentState",
    args: [escrowHash],
  });

  const [hasCollected, capturableAmount, refundableAmount] = escrowState as [
    boolean,
    bigint,
    bigint,
  ];
  log(
    `  Escrow state: hasCollected=${hasCollected}, capturable=${capturableAmount}, refundable=${refundableAmount}`,
  );

  if (capturableAmount > 0n) {
    pass("4E: USDC in escrow via HTTP 402 flow");
  } else {
    fail("4E: USDC in escrow", "capturableAmount is 0 after settle");
  }

  // ---- Step 4b: Verify payment state via SDK ----
  step("4b. Verify Payment State via SDK");

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

  try {
    const clientState = await client.getPaymentState(paymentInfo);
    log(`client.getPaymentState: ${clientState} (expected ${PaymentState.InEscrow})`);

    const exists = await client.paymentExists(escrowHash);
    log(`client.paymentExists: ${exists}`);

    const inEscrow = await client.isInEscrow(escrowHash);
    log(`client.isInEscrow: ${inEscrow}`);

    const payerPayments = await client.getPayerPayments(deployStartBlock);
    log(`client.getPayerPayments: ${payerPayments?.hashes?.length ?? 0} payment(s)`);

    const receiverPayments = await merchant.getReceiverPayments(deployStartBlock);
    log(`merchant.getReceiverPayments: ${receiverPayments?.hashes?.length ?? 0} payment(s)`);

    const amounts = await merchant.getPaymentAmounts(paymentInfo);
    log(
      `merchant.getPaymentAmounts: capturable=${amounts.capturableAmount}, refundable=${amounts.refundableAmount}`,
    );

    const merchantState = await merchant.getPaymentState(paymentInfo);
    log(`merchant.getPaymentState: ${merchantState}`);

    const arbiterState = await arbiter.getPaymentState(paymentInfo);
    log(`arbiter.getPaymentState: ${arbiterState}`);

    // Event log scanning (getPayerPayments/getReceiverPayments) is informational —
    // these can return 0 when the event indexing hasn't caught up or when the
    // authorize was submitted by the facilitator (different msg.sender). The core
    // state checks below are the reliable indicators.
    if (
      clientState === PaymentState.InEscrow &&
      exists &&
      inEscrow &&
      amounts.capturableAmount > 0n &&
      merchantState === PaymentState.InEscrow &&
      arbiterState === PaymentState.InEscrow
    ) {
      pass("All SDK payment queries return correct state after authorize");
    } else {
      fail("SDK payment queries", "One or more checks failed (see logs above)");
    }
  } catch (err) {
    fail("SDK payment queries", String(err));
  }

  // ---- Step 5: Payer Requests Refund ----
  step("5. Payer Requests Refund");

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
    args: [escrowHash],
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

  // ---- Step 11b: Verify post-refund state via SDK ----
  step("11b. Verify Post-Refund State via SDK");

  try {
    const postRefundState = await client.getPaymentState(paymentInfo);
    log(`client.getPaymentState: ${postRefundState} (expected Settled)`);

    const postRefundInEscrow = await client.isInEscrow(escrowHash);
    log(`client.isInEscrow: ${postRefundInEscrow} (expected false)`);

    const postRefundAmounts = await merchant.getPaymentAmounts(paymentInfo);
    log(
      `merchant.getPaymentAmounts: capturable=${postRefundAmounts.capturableAmount}, refundable=${postRefundAmounts.refundableAmount}`,
    );

    if (
      postRefundState === PaymentState.Settled &&
      !postRefundInEscrow &&
      postRefundAmounts.capturableAmount === 0n &&
      postRefundAmounts.refundableAmount === 0n
    ) {
      pass("All SDK queries return correct post-refund state");
    } else {
      fail("Post-refund SDK queries", "One or more checks failed (see logs above)");
    }
  } catch (err) {
    fail("Post-refund SDK queries", String(err));
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
