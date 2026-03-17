/**
 * Shared E2E test infrastructure
 *
 * Extracts common setup, helpers, and infrastructure used across all E2E test files:
 *   - index.ts (full payment lifecycle)
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { x402Client } from '@x402/core/client'
import { x402Facilitator } from '@x402/core/facilitator'
import { x402HTTPClient } from '@x402/core/http'
import {
  type HTTPResponseInstructions,
  x402HTTPResourceServer,
  x402ResourceServer,
} from '@x402/core/server'
import type { PaymentPayload, PaymentRequirements } from '@x402/core/types'
import { toFacilitatorEvmSigner } from '@x402/evm'
import {
  computePaymentInfoHash,
  deployMarketplaceOperator,
  fromNetworkId,
  getChainConfig,
  type PaymentInfo,
  refundRequestEvidenceAbi,
  toPaymentInfo,
  type X402rChainConfig,
} from '@x402r/core'
import { type EscrowPayload, isEscrowPayload } from '@x402r/evm'
import { registerEscrowEvmScheme as registerEscrowClientScheme } from '@x402r/evm/escrow/client'
import { registerEscrowEvmScheme as registerEscrowFacilitatorScheme } from '@x402r/evm/escrow/facilitator'
import { registerEscrowEvmScheme as registerEscrowServerScheme } from '@x402r/evm/escrow/server'
import { refundable } from '@x402r/helpers'
import { createX402r, type X402r } from '@x402r/sdk'
import {
  type Address,
  createPublicClient,
  createWalletClient,
  erc20Abi,
  formatEther,
  formatUnits,
  http,
  type PublicClient,
  publicActions,
  type WalletClient,
} from 'viem'
import {
  english,
  generateMnemonic,
  mnemonicToAccount,
  privateKeyToAccount,
} from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

// ============ Contract Bytecodes ============

const __dirname = dirname(fileURLToPath(import.meta.url))
const evidenceArtifact = JSON.parse(
  readFileSync(
    resolve(
      __dirname,
      '../../../x402r-contracts/out/RefundRequestEvidence.sol/RefundRequestEvidence.json',
    ),
    'utf-8',
  ),
)
const EVIDENCE_BYTECODE = evidenceArtifact.bytecode.object as `0x${string}`

// ============ Config Constants ============

const NETWORK_ID = process.env.NETWORK_ID ?? 'eip155:84532'
const RPC_URL = process.env.RPC_URL ?? 'https://sepolia.base.org'
export const USDC_ADDRESS =
  '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address
export const PAYMENT_AMOUNT = 10000n // 0.01 USDC (6 decimals)
const GAS_FUNDING = 10000000000000n // 0.00001 ETH per derived account
export const SCANNER = 'https://sepolia.basescan.org'

// ============ Step Runner ============

interface StepResult {
  name: string
  pass: boolean
  txHash?: string
  error?: string
}

export class StepRunner {
  private results: StepResult[] = []

  log(msg: string): void {
    console.log(`  ${msg}`)
  }

  step(name: string): void {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`STEP: ${name}`)
    console.log('='.repeat(60))
  }

  pass(name: string, txHash?: string): void {
    console.log(`  ✓ PASS: ${name}`)
    if (txHash) console.log(`    tx: ${SCANNER}/tx/${txHash}`)
    this.results.push({ name, pass: true, txHash })
  }

  fail(name: string, error: string): void {
    console.log(`  ✗ FAIL: ${name}`)
    console.log(`    error: ${error}`)
    this.results.push({ name, pass: false, error })
  }

  assert(condition: boolean, name: string, errorMsg?: string): void {
    if (condition) {
      this.pass(name)
    } else {
      this.fail(name, errorMsg ?? 'Assertion failed')
    }
  }

  summary(): { passed: number; failed: number; total: number } {
    const passed = this.results.filter((r) => r.pass).length
    const failed = this.results.filter((r) => !r.pass).length
    return { passed, failed, total: passed + failed }
  }

  printSummary(title: string): void {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`  ${title}`)
    console.log('='.repeat(60))

    for (const r of this.results) {
      const icon = r.pass ? '✓' : '✗'
      console.log(`  ${icon} ${r.name}`)
      if (r.txHash) console.log(`    ${SCANNER}/tx/${r.txHash}`)
      if (r.error) console.log(`    ERROR: ${r.error}`)
    }

    const { passed, failed, total } = this.summary()
    console.log(
      `\n  Result: ${passed} passed, ${failed} failed out of ${total} steps`,
    )
  }

  exitWithResults(passMsg: string, failMsg: string): void {
    const { failed } = this.summary()
    if (failed > 0) {
      console.log(`\n  ✗ ${failMsg}`)
      process.exit(1)
    } else {
      console.log(`\n  ✓ ${passMsg}`)
    }
  }
}

// ============ Helpers ============

export function shortAddr(addr: string): string {
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function waitForTx(
  publicClient: PublicClient,
  hash: `0x${string}`,
) {
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
  })
  if (receipt.status !== 'success') {
    throw new Error(`Transaction reverted: ${hash}`)
  }
  await sleep(2000)
  return receipt
}

// ============ Account Setup ============

interface E2EAccounts {
  payerAccount: ReturnType<typeof privateKeyToAccount>
  merchantAccount: ReturnType<typeof mnemonicToAccount>
  arbiterAccount?: ReturnType<typeof mnemonicToAccount>
  publicClient: PublicClient
  payerWallet: WalletClient
  merchantWallet: WalletClient
  arbiterWallet?: WalletClient
  chainConfig: X402rChainConfig
  chainId: number
}

export async function setupE2EAccounts(
  privateKey: `0x${string}`,
  opts?: { derivedCount?: number },
): Promise<E2EAccounts> {
  const derivedCount = opts?.derivedCount ?? 2
  const mnemonic = generateMnemonic(english)

  const payerAccount = privateKeyToAccount(privateKey)
  const merchantAccount = mnemonicToAccount(mnemonic, { addressIndex: 0 })
  const arbiterAccount =
    derivedCount >= 2
      ? mnemonicToAccount(mnemonic, { addressIndex: 1 })
      : undefined

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  })

  const payerWallet = createWalletClient({
    account: payerAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  })

  const merchantWallet = createWalletClient({
    account: merchantAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  })

  const arbiterWallet = arbiterAccount
    ? createWalletClient({
        account: arbiterAccount,
        chain: baseSepolia,
        transport: http(RPC_URL),
      })
    : undefined

  const chainId = fromNetworkId(NETWORK_ID)
  const chainConfig = getChainConfig(chainId)

  return {
    payerAccount,
    merchantAccount,
    arbiterAccount,
    publicClient,
    payerWallet,
    merchantWallet,
    arbiterWallet,
    chainConfig,
    chainId,
  }
}

export async function checkAndLogBalances(
  accounts: E2EAccounts,
  runner: StepRunner,
): Promise<void> {
  const { publicClient, payerAccount } = accounts
  const ethBalance = await publicClient.getBalance({
    address: payerAccount.address,
  })
  const usdcBalance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [payerAccount.address],
  })

  runner.log(`Payer ETH balance:  ${formatEther(ethBalance)} ETH`)
  runner.log(`Payer USDC balance: ${formatUnits(usdcBalance, 6)} USDC`)

  const minEth = GAS_FUNDING * BigInt(accounts.arbiterAccount ? 5 : 3)
  if (ethBalance < minEth) {
    console.error(
      `Error: Insufficient ETH. Need at least ${formatEther(minEth)} ETH for gas.`,
    )
    process.exit(1)
  }
  if (usdcBalance < PAYMENT_AMOUNT) {
    console.error(
      `Error: Insufficient USDC. Need at least ${formatUnits(PAYMENT_AMOUNT, 6)} USDC.`,
    )
    process.exit(1)
  }
}

export async function fundDerivedAccounts(
  accounts: E2EAccounts,
  runner: StepRunner,
): Promise<void> {
  const {
    payerWallet,
    payerAccount,
    merchantAccount,
    arbiterAccount,
    publicClient,
  } = accounts

  runner.log('Funding merchant with ETH for gas...')
  const fundMerchantTx = await payerWallet.sendTransaction({
    to: merchantAccount.address,
    value: GAS_FUNDING,
    chain: baseSepolia,
    account: payerAccount,
  })
  await waitForTx(publicClient, fundMerchantTx)
  runner.log(`  Funded merchant: ${SCANNER}/tx/${fundMerchantTx}`)

  if (arbiterAccount) {
    runner.log('Funding arbiter with ETH for gas...')
    const fundArbiterTx = await payerWallet.sendTransaction({
      to: arbiterAccount.address,
      value: GAS_FUNDING,
      chain: baseSepolia,
      account: payerAccount,
    })
    await waitForTx(publicClient, fundArbiterTx)
    runner.log(`  Funded arbiter: ${SCANNER}/tx/${fundArbiterTx}`)
  }
}

// ============ Operator Deployment ============

interface DeployResult {
  operatorAddress: Address
  escrowPeriodAddress: Address
  freezeAddress: Address | null
  refundRequestAddress: Address
  refundInEscrowConditionAddress: Address
  refundRequestEvidenceAddress: Address
  feeCalculatorAddress: Address | null
  summary: {
    newCount: number
    existingCount: number
    txHashes: `0x${string}`[]
  }
}

export async function deployTestOperator(
  accounts: E2EAccounts,
  runner: StepRunner,
): Promise<DeployResult> {
  const { payerWallet, payerAccount, arbiterAccount, publicClient, chainId } =
    accounts

  const deployResult = await deployMarketplaceOperator(
    payerWallet,
    publicClient,
    {
      chainId,
      feeRecipient: payerAccount.address,
      arbiter: (arbiterAccount ?? payerAccount).address,
      escrowPeriodSeconds: 604800n,
      freezeDurationSeconds: 259200n,
      operatorFeeBps: 100n,
    },
  )

  runner.log(`Operator: ${deployResult.operatorAddress}`)
  runner.pass(
    'Deploy operator',
    deployResult.summary.txHashes.length > 0
      ? deployResult.summary.txHashes[0]
      : undefined,
  )

  // Deploy RefundRequestEvidence bound to the per-arbiter RefundRequest
  // Use a fresh wallet client to avoid stale nonce from prior multicall batch
  runner.log('Deploying RefundRequestEvidence...')
  const freshPayerWallet = createWalletClient({
    account: payerAccount,
    chain: payerWallet.chain,
    transport: http(RPC_URL),
  })
  const evidenceDeployTx = await freshPayerWallet.deployContract({
    abi: refundRequestEvidenceAbi,
    bytecode: EVIDENCE_BYTECODE,
    args: [deployResult.refundRequestAddress],
    account: payerAccount,
    chain: payerWallet.chain,
  })
  await waitForTx(publicClient, evidenceDeployTx)
  const evidenceReceipt = await publicClient.getTransactionReceipt({
    hash: evidenceDeployTx,
  })
  const evidenceAddress = evidenceReceipt.contractAddress as Address
  runner.log(`  RefundRequestEvidence: ${evidenceAddress}`)
  runner.pass('Deploy RefundRequestEvidence', evidenceDeployTx)

  return {
    operatorAddress: deployResult.operatorAddress,
    escrowPeriodAddress: deployResult.escrowPeriodAddress,
    freezeAddress: deployResult.freezeAddress,
    refundRequestAddress: deployResult.refundRequestAddress,
    refundInEscrowConditionAddress: deployResult.refundInEscrowConditionAddress,
    refundRequestEvidenceAddress: evidenceAddress,
    feeCalculatorAddress: deployResult.feeCalculatorAddress,
    summary: deployResult.summary,
  }
}

// ============ HTTP 402 Infrastructure ============

interface FacilitatorClientLike {
  verify(
    paymentPayload: unknown,
    paymentRequirements: unknown,
  ): Promise<unknown>
  settle(
    paymentPayload: unknown,
    paymentRequirements: unknown,
  ): Promise<unknown>
  getSupported(): Promise<unknown>
}

function createInProcessFacilitator<
  T extends {
    verify(
      paymentPayload: unknown,
      paymentRequirements: unknown,
    ): Promise<unknown>
    settle(
      paymentPayload: unknown,
      paymentRequirements: unknown,
    ): Promise<unknown>
    getSupported(): unknown
  },
>(
  facilitator: T,
  registerSchemes: (fac: T) => void,
): { facilitator: T; client: FacilitatorClientLike } {
  registerSchemes(facilitator)
  const client: FacilitatorClientLike = {
    verify: (p: unknown, r: unknown) => facilitator.verify(p, r),
    settle: (p: unknown, r: unknown) => facilitator.settle(p, r),
    getSupported: () => Promise.resolve(facilitator.getSupported()),
  }
  return { facilitator, client }
}

interface HTTP402Infrastructure {
  httpServer: x402HTTPResourceServer
  httpClient: x402HTTPClient
  facilitatorClient: FacilitatorClientLike
}

export async function setupHTTP402(
  accounts: E2EAccounts,
  operatorAddress: string,
): Promise<HTTP402Infrastructure> {
  const { payerAccount } = accounts

  // In-process facilitator
  const facilitatorViemClient = createWalletClient({
    account: payerAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  }).extend(publicActions)

  const signer = toFacilitatorEvmSigner({
    address: payerAccount.address,
    getCode: (args: { address: `0x${string}` }) =>
      facilitatorViemClient.getCode(args),
    readContract: (args: {
      address: `0x${string}`
      abi: readonly unknown[]
      functionName: string
      args?: readonly unknown[]
    }) =>
      facilitatorViemClient.readContract({ ...args, args: args.args || [] }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verifyTypedData: (args: any) => facilitatorViemClient.verifyTypedData(args),
    writeContract: (args: {
      address: `0x${string}`
      abi: readonly unknown[]
      functionName: string
      args: readonly unknown[]
    }) =>
      facilitatorViemClient.writeContract({ ...args, args: args.args || [] }),
    sendTransaction: (args: { to: `0x${string}`; data: `0x${string}` }) =>
      facilitatorViemClient.sendTransaction(args),
    waitForTransactionReceipt: (args: { hash: `0x${string}` }) =>
      facilitatorViemClient.waitForTransactionReceipt(args),
  })
  const { client: facilitatorClient } = createInProcessFacilitator(
    new x402Facilitator(),
    (fac) =>
      registerEscrowFacilitatorScheme(fac, {
        signer,
        networks: NETWORK_ID,
      }),
  )

  // Resource server with escrow scheme
  const resourceServer = new x402ResourceServer(
    facilitatorClient as Parameters<
      typeof x402ResourceServer.prototype.constructor
    >[0],
  )
  registerEscrowServerScheme(resourceServer, { networks: NETWORK_ID })
  await resourceServer.initialize()

  // HTTP server with refundable route
  const routes = {
    '/api/weather': {
      accepts: refundable(
        {
          scheme: 'escrow',
          network: NETWORK_ID,
          payTo: accounts.merchantAccount.address,
          price: '$0.01',
        },
        operatorAddress as `0x${string}`,
        { maxFeeBps: 10000 },
      ),
      description: 'Weather API (E2E test)',
      mimeType: 'application/json',
    },
  }
  const httpServer = new x402HTTPResourceServer(resourceServer, routes)
  await httpServer.initialize()

  // Client with escrow scheme
  const paymentClient = new x402Client()
  registerEscrowClientScheme(paymentClient, {
    signer: payerAccount,
    networks: NETWORK_ID,
  })
  const httpClient = new x402HTTPClient(paymentClient)

  return { httpServer, httpClient, facilitatorClient }
}

// ============ HTTP 402 Payment Flow ============

interface HTTP402PaymentResult {
  paymentInfo: PaymentInfo
  escrowHash: `0x${string}`
  settleTxHash: string
  verifiedPayload: PaymentPayload
  verifiedRequirements: PaymentRequirements
}

/**
 * Perform a complete HTTP 402 payment flow:
 *   402 -> Client creates payload -> Verify -> Settle -> Extract PaymentInfo
 */
export async function performHTTP402Payment(
  infra: HTTP402Infrastructure,
  accounts: E2EAccounts,
  runner: StepRunner,
): Promise<HTTP402PaymentResult> {
  const { httpServer, httpClient } = infra

  // Unpaid request -> 402
  const unpaidContext = {
    adapter: {
      getHeader: (_name: string) => undefined,
      getMethod: () => 'GET',
      getPath: () => '/api/weather',
      getUrl: () => 'https://e2e-test.local/api/weather',
      getAcceptHeader: () => 'application/json',
      getUserAgent: () => 'x402r-e2e/1.0',
    },
    path: '/api/weather',
    method: 'GET',
  }

  const unpaidResult = await httpServer.processHTTPRequest(unpaidContext)
  if (unpaidResult.type !== 'payment-error') {
    throw new Error(`Expected payment-error, got ${unpaidResult.type}`)
  }
  const initial402 = (
    unpaidResult as {
      type: 'payment-error'
      response: HTTPResponseInstructions
    }
  ).response
  if (initial402.status !== 402) {
    throw new Error(`Expected 402 status, got ${initial402.status}`)
  }
  runner.pass('Unpaid request returns 402')

  // Client parses 402 -> create payment
  const paymentRequired = httpClient.getPaymentRequiredResponse(
    (name) => initial402.headers[name],
    initial402.body,
  )
  const paymentPayload = await httpClient.createPaymentPayload(paymentRequired)
  const requestHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload)
  runner.pass('Client creates payment payload from 402')

  // Paid request -> verify
  const paidContext = {
    adapter: {
      getHeader: (name: string) =>
        requestHeaders[name] ?? requestHeaders[name.toUpperCase()] ?? undefined,
      getMethod: () => 'GET',
      getPath: () => '/api/weather',
      getUrl: () => 'https://e2e-test.local/api/weather',
      getAcceptHeader: () => 'application/json',
      getUserAgent: () => 'x402r-e2e/1.0',
    },
    path: '/api/weather',
    method: 'GET',
  }

  const paidResult = await httpServer.processHTTPRequest(paidContext)
  if (paidResult.type !== 'payment-verified') {
    const errMsg =
      paidResult.type === 'payment-error'
        ? JSON.stringify(
            (paidResult as { response: HTTPResponseInstructions }).response,
          )
        : paidResult.type
    throw new Error(`Expected payment-verified, got: ${errMsg}`)
  }
  runner.pass('Paid request verified')

  const {
    paymentPayload: verifiedPayload,
    paymentRequirements: verifiedRequirements,
  } = paidResult as {
    type: 'payment-verified'
    paymentPayload: PaymentPayload
    paymentRequirements: PaymentRequirements
  }

  // Settle on-chain
  const settlementResult = await httpServer.processSettlement(
    verifiedPayload,
    verifiedRequirements,
  )
  if (!settlementResult.success) {
    throw new Error(`Settlement failed: ${settlementResult.errorReason}`)
  }
  const settleTxHash = settlementResult.transaction
  await waitForTx(accounts.publicClient, settleTxHash as `0x${string}`)
  runner.pass('On-chain settlement', settleTxHash)

  // Extract PaymentInfo from EscrowPayload
  if (!isEscrowPayload(verifiedPayload.payload)) {
    throw new Error('Verified payload is not an EscrowPayload')
  }
  const paymentInfo = toPaymentInfo(verifiedPayload.payload as EscrowPayload)

  const escrowHash = computePaymentInfoHash(
    accounts.chainId,
    accounts.chainConfig.authCaptureEscrow as Address,
    paymentInfo,
  )

  return {
    paymentInfo,
    escrowHash,
    settleTxHash,
    verifiedPayload,
    verifiedRequirements,
  }
}

// ============ SDK Instance Creation ============

interface SDKInstances {
  payer: X402r
  merchant: X402r
  arbiter?: X402r
}

export function createSDKInstances(
  accounts: E2EAccounts,
  deployResult: DeployResult,
): SDKInstances {
  const { publicClient, payerWallet, merchantWallet, arbiterWallet, chainId } =
    accounts
  const opAddr = deployResult.operatorAddress
  const refundRequestAddress = deployResult.refundRequestAddress
  const freezeAddr = deployResult.freezeAddress ?? undefined
  const escrowPeriodAddr = deployResult.escrowPeriodAddress

  const commonConfig = {
    publicClient,
    operatorAddress: opAddr,
    chainId,
    refundRequestAddress,
    refundRequestEvidenceAddress: deployResult.refundRequestEvidenceAddress,
    escrowPeriodAddress: escrowPeriodAddr,
    freezeAddress: freezeAddr,
  }

  const payer = createX402r({ ...commonConfig, walletClient: payerWallet })
  const merchant = createX402r({
    ...commonConfig,
    walletClient: merchantWallet,
  })
  const arbiter = arbiterWallet
    ? createX402r({ ...commonConfig, walletClient: arbiterWallet })
    : undefined

  return { payer, merchant, arbiter }
}

// Re-export values and types used by test files
export type { Address }
export {
  authCaptureEscrowAbi,
  distributeFees,
  RefundRequestStatus,
} from '@x402r/core'
export { erc20Abi, formatUnits } from 'viem'
