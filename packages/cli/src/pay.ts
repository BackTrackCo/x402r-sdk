import { x402Client, x402HTTPClient } from '@x402/core/client'
import type {
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
} from '@x402/core/types'
import { toClientEvmSigner } from '@x402/evm'
import { registerCommerceEvmScheme } from '@x402r/evm/commerce/client'
import type { Account } from 'viem'
import { createPublicClient, http } from 'viem'
import { parseChainId, resolveChain } from './chain.js'
import {
  Malformed402Error,
  MaxAmountExceededError,
  NetworkError,
  SettlementError,
  SignatureRejectedError,
} from './errors.js'
import { resolveSigner } from './signers/index.js'
import type { SignerFlags, SignerKind } from './types.js'

export interface PayFlags extends SignerFlags {
  url: string
  chain?: string
  rpc?: string
  maxAmount?: string
  json?: boolean
}

export interface PayResult {
  body: string
  status: number
  tx?: string
  elapsedMs: number
  /** Present only when a payment was made; omitted on non-402 short-circuits. */
  signer?: { kind: SignerKind; address: string }
}

export async function pay(flags: PayFlags): Promise<PayResult> {
  const started = Date.now()

  const peek = await safeFetch(flags.url)

  if (peek.status !== 402) {
    return {
      body: await peek.text(),
      status: peek.status,
      elapsedMs: Date.now() - started,
    }
  }

  const httpClient = new x402HTTPClient(new x402Client())
  const peekBody = await readBodyForV1Fallback(peek)
  const paymentRequired = parsePaymentRequired(peek, httpClient, peekBody)

  const accept = pickAccept(paymentRequired.accepts, flags.chain)
  enforceMaxAmount(accept, flags.maxAmount)

  const chainId = parseChainId(accept.network)
  const chain = resolveChain(chainId, flags.rpc)
  const publicClient = createPublicClient({ chain, transport: http(flags.rpc) })

  const resolved = await resolveSigner(flags)
  const signer = toClientEvmSigner(adaptAccount(resolved.account), publicClient)

  const client = new x402Client()
  registerCommerceEvmScheme(client, {
    signer,
    networks: accept.network,
  })
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

  const body = await paid.text()
  if (paid.status >= 400) {
    throw new SettlementError(
      `merchant returned ${paid.status} after payment: ${truncate(body, 200)}`,
    )
  }

  const settle = tryParseSettle(paid, paymentHttpClient)
  if (settle && settle.success === false) {
    throw new SettlementError(
      `settlement failed: ${settle.errorReason ?? 'unknown'}`,
    )
  }

  return {
    body,
    status: paid.status,
    tx: settle?.transaction,
    elapsedMs: Date.now() - started,
    signer: {
      kind: resolved.kind,
      address: resolved.account.address,
    },
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

export function pickAccept(
  accepts: PaymentRequirements[],
  chainFilter: string | undefined,
): PaymentRequirements {
  if (accepts.length === 0) {
    throw new Malformed402Error('402 response has no accepts[] entries')
  }
  if (!chainFilter) {
    if (accepts.length > 1) {
      throw new Malformed402Error(
        `402 offers ${accepts.length} payment options; pass --chain <eip155:id> to pick one`,
      )
    }
    return accepts[0]!
  }

  const match = accepts.find((a) => a.network === chainFilter)
  if (!match) {
    throw new Malformed402Error(
      `no accepts[] entry matches --chain ${chainFilter}; offered: ${accepts.map((a) => a.network).join(', ')}`,
    )
  }
  return match
}

export function enforceMaxAmount(
  accept: PaymentRequirements,
  maxAmount: string | undefined,
): void {
  if (!maxAmount) return
  let amount: bigint
  let max: bigint
  try {
    amount = BigInt(accept.amount)
    max = BigInt(maxAmount)
  } catch {
    throw new MaxAmountExceededError(
      `invalid amount comparison: accept.amount=${accept.amount}, max=${maxAmount}`,
    )
  }
  if (amount > max) {
    throw new MaxAmountExceededError(
      `price ${amount} exceeds --max-amount ${max} (atomic units of ${accept.asset})`,
    )
  }
}

function tryParseSettle(
  res: Response,
  httpClient: x402HTTPClient,
): ReturnType<x402HTTPClient['getPaymentSettleResponse']> | undefined {
  try {
    return httpClient.getPaymentSettleResponse((name) => res.headers.get(name))
  } catch {
    return undefined
  }
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
