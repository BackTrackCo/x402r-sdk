import { x402Client } from '@x402/core/client'
import { x402Facilitator } from '@x402/core/facilitator'
import { HTTPFacilitatorClient, x402HTTPClient } from '@x402/core/http'
import type { PaymentPayload, PaymentRequirements } from '@x402/core/types'
import { toFacilitatorEvmSigner } from '@x402/evm'
import { paymentMiddleware, x402ResourceServer } from '@x402/express'
import { wrapFetchWithPayment } from '@x402/fetch'
import { authCaptureEscrowAbi, getChainConfig } from '@x402r/core'
import { AuthCaptureEvmScheme as AuthCaptureEvmClient } from '@x402r/evm/authCapture/client'
import { AuthCaptureFacilitatorScheme } from '@x402r/evm/authCapture/facilitator'
import { AuthCaptureServerScheme } from '@x402r/evm/authCapture/server'
import express from 'express'
import {
  type Address,
  createPublicClient,
  createTestClient,
  createWalletClient,
  erc20Abi,
  type Hash,
  http,
  numberToHex,
  parseEventLogs,
  publicActions,
  type TestClient,
  zeroAddress,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import {
  getBalanceSlot,
  testAccounts,
  USDC_BALANCE_SLOT,
} from '../shared/anvil-setup.js'
import { PAYMENT_AMOUNT } from '../shared/constants.js'
import { StepRunner } from './runner.js'

// ---------------------------------------------------------------------------
// Scenario: HTTP-wire Capture (cross-package integration test)
//
// First CI scenario that exercises the real HTTP 402 wire end-to-end:
//   payer fetch (x402Client + wrapFetchWithPayment)
//        │ HTTP 402 → 200
//        ▼
//   resource server (Express, paymentMiddleware + x402ResourceServer)
//        │ HTTPFacilitatorClient
//        ▼
//   facilitator (Express, x402Facilitator + AuthCaptureEvmScheme)
//        │ on-chain authorize tx
//        ▼
//   Anvil fork (shared prool subpath or self-spawned)
//
// Catches integration-seam bugs between upstream @x402/{core,evm,express,fetch}
// at 2.12.0 and our @x402r/evm at 0.2.0-alpha.0. autoCapture is intentionally
// left unset (authorize-only path) so the receiver should NOT see any token
// inflow; the post-conditions check tx-target + payer-debit + receiver-flat.
// ---------------------------------------------------------------------------

const CHAIN_ID = 84532
const NETWORK = 'eip155:84532' as const
const ANVIL_PORT = 8846
const PORT_FACILITATOR = 4322
const PORT_RESOURCE_SERVER = 4321

// Auth-capture canonical escrow address + USDC sourced from @x402r/core's
// chain-config so the wire-side assertion target stays in sync with the
// source-of-truth address table for Base + Base Sepolia.
const chainConfig = getChainConfig(CHAIN_ID)
const USDC: Address = chainConfig.usdc
const AUTH_CAPTURE_ESCROW: Address = chainConfig.authCaptureEscrow

// Reuse the deterministic Anvil accounts from shared/anvil-setup.ts.
// deployer (#0) doubles as the facilitator EOA + captureAuthorizer so on-chain
// `onlySender(operator)` resolves to msg.sender == captureAuthorizer on the
// direct-EOA path (no bytecode after setCode clears it). payer = #1, receiver
// = #2 — same role-mapping as the direct-SDK scenarios.
const { deployer, payer, receiver } = testAccounts

// ---------------------------------------------------------------------------
// 1. Anvil bootstrap (inline subset of shared/anvil-setup.ts).
//
// Direct-SDK scenarios in this examples folder use the shared setup() because
// they need a deployed MarketplaceOperator. The HTTP-wire path doesn't —
// captureAuthorizer is an EOA — so we keep the bootstrap minimal and avoid
// branching anvil-setup.ts on a skipOperatorDeploy flag (would force its
// return-shape to splinter for one caller).
// ---------------------------------------------------------------------------
async function bootstrapAnvil(): Promise<{
  publicClient: ReturnType<typeof createPublicClient>
  rpcUrl: string
  cleanup: () => Promise<void>
}> {
  const sharedRpcUrl = process.env.SCENARIO_RPC_URL
  let rpcUrl: string
  let cleanup: () => Promise<void>

  if (sharedRpcUrl) {
    try {
      new URL(sharedRpcUrl)
    } catch {
      throw new Error(
        `http-wire-capture: SCENARIO_RPC_URL is not a valid URL: ${sharedRpcUrl}`,
      )
    }
    rpcUrl = sharedRpcUrl
    cleanup = async () => {}
  } else {
    const { Instance, Server } = await import('prool')
    const server = Server.create({
      instance: Instance.anvil({
        chainId: CHAIN_ID,
        forkUrl:
          process.env.VITE_ANVIL_FORK_URL_BASE_SEPOLIA ??
          'https://sepolia.base.org',
      }),
      port: ANVIL_PORT,
    })
    await server.start()
    rpcUrl = `http://127.0.0.1:${ANVIL_PORT}/1`
    cleanup = async () => {
      await server.stop()
    }
  }

  const transport = http(rpcUrl)
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport,
    cacheTime: 0,
  })
  const testClient = createTestClient({
    chain: baseSepolia,
    transport,
    mode: 'anvil',
  }) as unknown as TestClient

  // Clear bytecode at the EOA accounts so ERC-3009 signer checks pass and so
  // the facilitator's `getCode(captureAuthorizer)` probe returns '0x' (EOA path).
  for (const addr of [deployer.address, payer.address, receiver.address]) {
    await testClient.setCode({ address: addr, bytecode: '0x' })
  }

  // Fund the payer with 10K USDC via storage-slot manipulation. Mirrors the
  // slot-fallback in shared/anvil-setup.ts: write slot 9 (Base Sepolia USDC
  // FiatTokenV2_2 balance mapping), then probe and fall back to slot 0 if the
  // first write didn't land. Defensive — if a future USDC upgrade ever shifts
  // the slot, both code paths react the same way.
  const payerUsdcAmount = 10_000_000_000n
  const payerSlot = getBalanceSlot(payer.address, USDC_BALANCE_SLOT)
  await testClient.setStorageAt({
    address: USDC,
    index: payerSlot,
    value: numberToHex(payerUsdcAmount, { size: 32 }),
  })
  const payerBalance = await publicClient.readContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [payer.address],
  })
  if (payerBalance === 0n) {
    const fallbackSlot = getBalanceSlot(payer.address, 0n)
    await testClient.setStorageAt({
      address: USDC,
      index: fallbackSlot,
      value: numberToHex(payerUsdcAmount, { size: 32 }),
    })
  }

  return { publicClient, rpcUrl, cleanup }
}

// ---------------------------------------------------------------------------
// 2. Facilitator setup (mirrors upstream
// examples/typescript/facilitator/authCapture/index.ts).
// ---------------------------------------------------------------------------
async function startFacilitator(rpcUrl: string): Promise<{
  url: string
  stop: () => Promise<void>
}> {
  const deployerAccount = privateKeyToAccount(deployer.privateKey)
  const viemClient = createWalletClient({
    account: deployerAccount,
    chain: baseSepolia,
    transport: http(rpcUrl),
  }).extend(publicActions)

  const evmSigner = toFacilitatorEvmSigner({
    address: deployerAccount.address,
    getCode: (args) => viemClient.getCode(args),
    readContract: (args) =>
      viemClient.readContract({
        ...args,
        args: args.args ?? [],
      } as Parameters<typeof viemClient.readContract>[0]),
    verifyTypedData: (args) =>
      viemClient.verifyTypedData(
        args as Parameters<typeof viemClient.verifyTypedData>[0],
      ),
    writeContract: (args) =>
      viemClient.writeContract(
        args as Parameters<typeof viemClient.writeContract>[0],
      ),
    sendTransaction: (args) =>
      viemClient.sendTransaction(
        args as Parameters<typeof viemClient.sendTransaction>[0],
      ),
    waitForTransactionReceipt: (args) =>
      viemClient.waitForTransactionReceipt(args),
  })

  const facilitator = new x402Facilitator()
  facilitator.register(NETWORK, new AuthCaptureFacilitatorScheme(evmSigner))

  const app = express()
  app.use(express.json())
  app.post('/verify', async (req, res) => {
    const { paymentPayload, paymentRequirements } = req.body as {
      paymentPayload: PaymentPayload
      paymentRequirements: PaymentRequirements
    }
    res.json(await facilitator.verify(paymentPayload, paymentRequirements))
  })
  app.post('/settle', async (req, res) => {
    const { paymentPayload, paymentRequirements } = req.body as {
      paymentPayload: PaymentPayload
      paymentRequirements: PaymentRequirements
    }
    res.json(await facilitator.settle(paymentPayload, paymentRequirements))
  })
  app.get('/supported', async (_req, res) => {
    res.json(facilitator.getSupported())
  })

  // Express's app.listen returns the http.Server synchronously; the
  // 'listening' event fires asynchronously. Await it before returning the URL
  // so a fast paidFetch on a cold runner doesn't race the bind. On bind error
  // the parent's finally block can't reach this server (startFacilitator
  // never returned), so close defensively before rejecting — server.close()
  // is idempotent on an unbound socket.
  const server = app.listen(PORT_FACILITATOR)
  await new Promise<void>((resolve, reject) => {
    server.once('listening', () => resolve())
    server.once('error', (err) => {
      server.close(() => {
        reject(new Error(`failed to bind ${PORT_FACILITATOR}: ${err.message}`))
      })
    })
  })
  return {
    url: `http://127.0.0.1:${PORT_FACILITATOR}`,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

// ---------------------------------------------------------------------------
// 3. Resource server setup (mirrors upstream
// examples/typescript/servers/authCapture/index.ts).
// ---------------------------------------------------------------------------
async function startResourceServer(
  facilitatorUrl: string,
  captureAuthorizer: Address,
  publicClient: ReturnType<typeof createPublicClient>,
): Promise<{
  url: string
  stop: () => Promise<void>
}> {
  const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl })
  const resourceServer = new x402ResourceServer(facilitatorClient).register(
    NETWORK,
    new AuthCaptureServerScheme(),
  )

  // Derive `now` from the latest Anvil block instead of wall-clock so the
  // deadlines we publish in `extra` use the same reference frame the escrow
  // contract checks against (`block.timestamp`). On a freshly-forked Anvil
  // block.timestamp == wall-clock so the values match in practice today; the
  // 3600s buffer would absorb any sub-second drift either way. Switching the
  // source removes the wrong-reference-frame footgun if a future scenario
  // ever fast-forwards the chain (`testClient.increaseTime`).
  const latestBlock = await publicClient.getBlock({ blockTag: 'latest' })
  const now = Number(latestBlock.timestamp)
  const app = express()
  app.use(
    paymentMiddleware(
      {
        'GET /widget': {
          accepts: {
            scheme: 'authCapture',
            // Custom AssetAmount: pin USDC + base-unit amount directly so we
            // don't rely on getDefaultAsset (which would also work but couples
            // the scenario to an extra default-asset lookup). EIP-712 domain
            // fields (name/version) go in the top-level `extra` below — that's
            // the canonical merge target in x402ResourceServer
            // (`extra: { ...parsedPrice.extra, ...resourceConfig.extra }`),
            // so a duplicate `price.extra` would be silently shadowed.
            price: {
              asset: USDC,
              amount: PAYMENT_AMOUNT.toString(),
            },
            network: NETWORK,
            payTo: receiver.address,
            // maxTimeoutSeconds is required by the client scheme (used to
            // derive preApprovalExpiry). Upstream example omits this because
            // it has a default; we set it explicitly for clarity.
            maxTimeoutSeconds: 600,
            extra: {
              captureAuthorizer,
              // Absolute deadlines instead of *Seconds offsets — easier to
              // reason about in a one-off scenario.
              captureDeadline: now + 3600,
              refundDeadline: now + 7200,
              // zeroAddress = deferred fee-recipient selection (per spec, the
              // captureAuthorizer picks any non-zero recipient at capture
              // time). Since the scenario only authorizes (autoCapture left
              // unset), no fee is actually paid out in this run.
              feeRecipient: zeroAddress,
              minFeeBps: 0,
              maxFeeBps: 100,
              name: 'USDC',
              version: '2',
            },
          },
          description: 'A widget',
          mimeType: 'application/json',
        },
      },
      resourceServer,
    ),
  )
  app.get('/widget', (_req, res) => {
    res.send({ ok: true })
  })

  // See startFacilitator for the rationale on awaiting 'listening' + the
  // defensive close-on-error.
  const server = app.listen(PORT_RESOURCE_SERVER)
  await new Promise<void>((resolve, reject) => {
    server.once('listening', () => resolve())
    server.once('error', (err) => {
      server.close(() => {
        reject(
          new Error(`failed to bind ${PORT_RESOURCE_SERVER}: ${err.message}`),
        )
      })
    })
  })
  return {
    url: `http://127.0.0.1:${PORT_RESOURCE_SERVER}`,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const ctx = await bootstrapAnvil()
  const runner = new StepRunner(
    'HTTP-wire Capture (cross-package integration)',
    ctx.publicClient,
  )

  let facilitator: { url: string; stop: () => Promise<void> } | undefined
  let resourceServer: { url: string; stop: () => Promise<void> } | undefined

  try {
    runner.step('Start in-process facilitator + resource server')
    facilitator = await startFacilitator(ctx.rpcUrl)
    runner.log(`Facilitator: ${facilitator.url}`)
    resourceServer = await startResourceServer(
      facilitator.url,
      // captureAuthorizer = facilitator EOA (deployer). Ensures
      // paymentInfo.operator == facilitator submitter, so the escrow's
      // `onlySender(operator)` gate passes on the direct-EOA call path.
      deployer.address,
      ctx.publicClient,
    )
    runner.log(`Resource server: ${resourceServer.url}/widget`)

    runner.step('Snapshot pre-payment balances')
    const readBalance = (owner: Address) =>
      ctx.publicClient.readContract({
        address: USDC,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [owner],
      })
    const payerBefore = await readBalance(payer.address)
    const receiverBefore = await readBalance(receiver.address)
    runner.log(`Payer USDC: ${payerBefore}`)
    runner.log(`Receiver USDC: ${receiverBefore}`)

    runner.step('Issue paid fetch through wrapFetchWithPayment')
    const payerAccount = privateKeyToAccount(payer.privateKey)
    // x402Client.register() requires a SchemeNetworkClient. Our
    // AuthCaptureEvmClient takes a ClientEvmSigner; viem's
    // privateKeyToAccount already satisfies the signTypedData portion.
    const client = new x402Client()
    client.register(NETWORK, new AuthCaptureEvmClient(payerAccount))
    const paidFetch = wrapFetchWithPayment(fetch, client)

    const response = await paidFetch(`${resourceServer.url}/widget`, {
      method: 'GET',
    })
    runner.assert(
      response.status === 200,
      `HTTP 200 on paid request (got ${response.status})`,
    )
    const body = (await response.json()) as { ok?: boolean }
    runner.assert(body.ok === true, 'response body { ok: true }')

    runner.step('Validate settle response header (x-payment-response)')
    const settleResponse = new x402HTTPClient(client).getPaymentSettleResponse(
      (name) => response.headers.get(name),
    )
    runner.assert(
      settleResponse.success === true,
      `settleResponse.success === true (errorReason: ${settleResponse.errorReason ?? 'n/a'})`,
    )
    runner.assert(
      (settleResponse.payer ?? '').toLowerCase() ===
        payer.address.toLowerCase(),
      `settleResponse.payer matches payer (${payer.address})`,
    )
    runner.log(`settle tx: ${settleResponse.transaction}`)

    runner.step('Verify on-chain settle landed (authorize-only)')
    // The authCapture escrow is the canonical CREATE2-deployed AuthCaptureEscrow
    // singleton. Funds for an authorized-but-not-captured payment don't sit at
    // the singleton — the escrow creates a per-payment vault via internal
    // accounting (commerce-payments uses a paymentInfoHash-indexed mapping).
    // The wire-level invariants we can check at the singleton level are:
    //   1. settle tx targeted the singleton escrow (not some other contract);
    //   2. payer balance ↓ PAYMENT_AMOUNT (tokens actually moved);
    //   3. receiver balance unchanged (no autoCapture occurred).
    // Together these prove the HTTP wire successfully drove a settle into the
    // right contract via the @x402/express ↔ @x402r/evm seam.
    if (!settleResponse.transaction) {
      runner.fail('settleResponse missing transaction hash')
    }
    const receipt = await ctx.publicClient.getTransactionReceipt({
      hash: settleResponse.transaction as Hash,
    })
    runner.assert(
      receipt.status === 'success',
      `settle tx receipt status === 'success'`,
    )
    runner.assert(
      (receipt.to ?? '').toLowerCase() === AUTH_CAPTURE_ESCROW.toLowerCase(),
      `settle tx targeted AuthCaptureEscrow (${AUTH_CAPTURE_ESCROW}); actual ${receipt.to}`,
    )

    const payerAfter = await readBalance(payer.address)
    const receiverAfter = await readBalance(receiver.address)
    runner.assert(
      payerBefore - payerAfter === PAYMENT_AMOUNT,
      `payer USDC ↓ PAYMENT_AMOUNT (${PAYMENT_AMOUNT}); actual ↓ ${payerBefore - payerAfter}`,
    )
    runner.assert(
      receiverAfter === receiverBefore,
      `receiver USDC unchanged (autoCapture left unset); actual delta ${receiverAfter - receiverBefore}`,
    )

    runner.step('Verify escrow internal state via paymentState(hash)')
    // Token balance checks above prove value moved. They do NOT prove the
    // escrow's internal `_paymentState` mapping was updated — a contract bug
    // or migration that moves tokens via ERC-3009 but leaves capturableAmount
    // / hasCollectedPayment unset would pass everything above and only
    // surface when a downstream capture tried to operate on the missing
    // state. (Note: an off-by-one paymentInfoHash failure mode isn't
    // reachable in practice — the same hash is the ERC-3009 nonce, so a
    // bad hash either reverts the tx or debits the wrong payer.)
    const authorizedEvents = parseEventLogs({
      abi: authCaptureEscrowAbi,
      eventName: 'PaymentAuthorized',
      logs: receipt.logs,
    })
    runner.assert(
      authorizedEvents.length === 1,
      `exactly one PaymentAuthorized event emitted (got ${authorizedEvents.length})`,
    )
    const paymentInfoHash = authorizedEvents[0].args.paymentInfoHash
    const [hasCollectedPayment, capturableAmount, refundableAmount] =
      await ctx.publicClient.readContract({
        address: AUTH_CAPTURE_ESCROW,
        abi: authCaptureEscrowAbi,
        functionName: 'paymentState',
        args: [paymentInfoHash],
      })
    runner.assert(
      hasCollectedPayment === true,
      `paymentState.hasCollectedPayment === true; actual ${hasCollectedPayment}`,
    )
    runner.assert(
      capturableAmount === PAYMENT_AMOUNT,
      `paymentState.capturableAmount === PAYMENT_AMOUNT (${PAYMENT_AMOUNT}); actual ${capturableAmount}`,
    )
    runner.assert(
      refundableAmount === 0n,
      `paymentState.refundableAmount === 0 (no capture occurred); actual ${refundableAmount}`,
    )

    runner.done()
  } finally {
    if (resourceServer) await resourceServer.stop()
    if (facilitator) await facilitator.stop()
    await ctx.cleanup()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
