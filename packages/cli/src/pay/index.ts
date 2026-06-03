import { x402Client, x402HTTPClient } from '@x402/core/client'
import type { PaymentPayload, PaymentRequired } from '@x402/core/types'
import { toClientEvmSigner } from '@x402/evm'
import { AuthCaptureEvmScheme } from '@x402/evm/auth-capture/client'
import type { Account } from 'viem'
import { createPublicClient, http } from 'viem'
import { parseChainId, resolveChain } from '../chain.js'
import {
  Malformed402Error,
  NetworkError,
  SettlementError,
  SignatureRejectedError,
} from '../errors.js'
import { resolveSigner } from '../signers/index.js'
import type { SignerFlags, SignerKind } from '../types.js'
import { enforceMaxAmount, pickAccept } from './policy.js'

export interface PayFlags extends SignerFlags {
  url: string
  chain?: string
  rpc?: string
  maxAmount?: string
  /**
   * Filter accepts[] to entries with `extra.assetTransferMethod === <value>`.
   * Validated as `'eip3009' | 'permit2'` inside `pickAccept`.
   */
  assetTransferMethod?: string
  json?: boolean
}

export interface SignerMeta {
  kind: SignerKind
  address: string
}

export type PayResult =
  | {
      kind: 'success'
      body: string
      status: number
      tx: string
      elapsedMs: number
      signer: SignerMeta
    }
  | {
      kind: 'passthrough'
      body: string
      status: number
      elapsedMs: number
      signer: SignerMeta
    }
  | {
      kind: 'no_payment_required'
      body: string
      status: number
      elapsedMs: number
    }

export async function pay(flags: PayFlags): Promise<PayResult> {
  const started = Date.now()

  const peek = await safeFetch(flags.url)

  if (peek.status !== 402) {
    return {
      kind: 'no_payment_required',
      body: await peek.text(),
      status: peek.status,
      elapsedMs: Date.now() - started,
    }
  }

  const httpClient = new x402HTTPClient(new x402Client())
  const peekBody = await readBodyForV1Fallback(peek)
  const paymentRequired = parsePaymentRequired(peek, httpClient, peekBody)

  const accept = pickAccept(paymentRequired.accepts, {
    chain: flags.chain,
    assetTransferMethod: flags.assetTransferMethod,
  })
  enforceMaxAmount(accept, flags.maxAmount)

  const chainId = parseChainId(accept.network)
  const chain = resolveChain(chainId, flags.rpc)
  const publicClient = createPublicClient({ chain, transport: http(flags.rpc) })

  const resolved = await resolveSigner(flags)
  const signer = toClientEvmSigner(adaptAccount(resolved.account), publicClient)

  const client = new x402Client()
  client.register(accept.network, new AuthCaptureEvmScheme(signer))
  const paymentHttpClient = new x402HTTPClient(client)

  let payload: PaymentPayload
  try {
    payload = await client.createPaymentPayload(paymentRequired)
  } catch (err) {
    throw new SignatureRejectedError(
      `failed to build payment payload: ${errorMessage(err)}`,
    )
  }

  const paymentHeaders = paymentHttpClient.encodePaymentSignatureHeader(payload)
  const paid = await safeFetch(flags.url, {
    headers: {
      ...paymentHeaders,
      'Access-Control-Expose-Headers': 'PAYMENT-RESPONSE,X-PAYMENT-RESPONSE',
    },
  })

  const result = await paymentHttpClient.processResponse(paid)
  return applyPaymentResult(result, paid.status, started, {
    kind: resolved.kind,
    address: resolved.account.address,
  })
}

/**
 * Maps upstream `x402PaymentResult` to a cli `PayResult`. Terminal failure
 * variants throw `SettlementError`; success/passthrough return.
 *
 * Exported for tests.
 */
export function applyPaymentResult(
  result: Awaited<ReturnType<x402HTTPClient['processResponse']>>,
  paidStatus: number,
  startedMs: number,
  signer: SignerMeta,
): PayResult {
  switch (result.kind) {
    case 'success':
      return {
        kind: 'success',
        body: stringifyBody(result.body),
        status: paidStatus,
        tx: result.settleResponse.transaction,
        elapsedMs: Date.now() - startedMs,
        signer,
      }
    case 'passthrough':
      return {
        kind: 'passthrough',
        body: stringifyBody(result.body),
        status: paidStatus,
        elapsedMs: Date.now() - startedMs,
        signer,
      }
    case 'settle_failed':
      throw new SettlementError(
        `settlement failed: ${result.settleResponse.errorReason ?? 'unknown'}`,
      )
    case 'payment_required':
      throw new SettlementError('merchant re-issued 402 after payment')
    case 'error':
      throw new SettlementError(
        `merchant returned ${result.status} after payment: ${truncate(stringifyBody(result.body), 200)}`,
      )
  }
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (err) {
    throw new NetworkError(`fetch ${url} failed: ${errorMessage(err)}`)
  }
}

async function readBodyForV1Fallback(
  res: Response,
): Promise<PaymentRequired | undefined> {
  try {
    const text = await res.clone().text()
    if (!text) return undefined
    return JSON.parse(text) as PaymentRequired
  } catch {
    return undefined
  }
}

function parsePaymentRequired(
  res: Response,
  httpClient: x402HTTPClient,
  body: PaymentRequired | undefined,
): PaymentRequired {
  try {
    return httpClient.getPaymentRequiredResponse(
      (name) => res.headers.get(name),
      body,
    )
  } catch (err) {
    throw new Malformed402Error(
      `failed to parse 402 payment-required: ${errorMessage(err)}`,
    )
  }
}

function stringifyBody(body: unknown): string {
  return typeof body === 'string' ? body : JSON.stringify(body)
}

function adaptAccount(
  account: Account,
): Parameters<typeof toClientEvmSigner>[0] {
  // viem's Account has narrower generics on signTypedData; toClientEvmSigner
  // only cares about the runtime shape, so we widen at the boundary.
  return account as unknown as Parameters<typeof toClientEvmSigner>[0]
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
}
