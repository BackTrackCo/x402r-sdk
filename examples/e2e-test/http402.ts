/**
 * HTTP 402 infrastructure setup and payment flow execution.
 */

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
  type PaymentInfo,
  toPaymentInfo,
} from '@x402r/core'
import { type EscrowPayload, isEscrowPayload } from '@x402r/evm'
import { registerEscrowEvmScheme as registerEscrowClientScheme } from '@x402r/evm/escrow/client'
import { registerEscrowEvmScheme as registerEscrowFacilitatorScheme } from '@x402r/evm/escrow/facilitator'
import { registerEscrowEvmScheme as registerEscrowServerScheme } from '@x402r/evm/escrow/server'
import { refundable } from '@x402r/helpers'
import { type Address, createWalletClient, http, publicActions } from 'viem'
import { baseSepolia } from 'viem/chains'

import type { E2EAccounts } from './accounts.js'
import { NETWORK_ID, RPC_URL, waitForTx } from './config.js'
import type { StepRunner } from './runner.js'

// ============ Types ============

interface FacilitatorClientLike {
  verify(
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements,
  ): Promise<unknown>
  settle(
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements,
  ): Promise<unknown>
  getSupported(): Promise<unknown>
}

function createInProcessFacilitator<
  T extends {
    verify(
      paymentPayload: PaymentPayload,
      paymentRequirements: PaymentRequirements,
    ): Promise<unknown>
    settle(
      paymentPayload: PaymentPayload,
      paymentRequirements: PaymentRequirements,
    ): Promise<unknown>
    getSupported(): unknown
  },
>(
  facilitator: T,
  registerSchemes: (fac: T) => void,
): { facilitator: T; client: FacilitatorClientLike } {
  registerSchemes(facilitator)
  const client: FacilitatorClientLike = {
    verify: (p: PaymentPayload, r: PaymentRequirements) =>
      facilitator.verify(p, r),
    settle: (p: PaymentPayload, r: PaymentRequirements) =>
      facilitator.settle(p, r),
    getSupported: () => Promise.resolve(facilitator.getSupported()),
  }
  return { facilitator, client }
}

interface HTTP402Infrastructure {
  httpServer: x402HTTPResourceServer
  httpClient: x402HTTPClient
  facilitatorClient: FacilitatorClientLike
}

interface HTTP402PaymentResult {
  paymentInfo: PaymentInfo
  escrowHash: `0x${string}`
}

// ============ Setup ============

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
    verifyTypedData: (
      args: Parameters<typeof facilitatorViemClient.verifyTypedData>[0],
    ) => facilitatorViemClient.verifyTypedData(args),
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
  }
}
