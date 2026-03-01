import type { EscrowPayload } from '@x402r/evm'
import { ValidationError } from '../errors/index.js'
import type { PaymentInfo } from '../types/index.js'

// ---------------------------------------------------------------------------
// Wire-format → PaymentInfo
// ---------------------------------------------------------------------------

// Expiry timestamps and fee basis-point fields are omitted — they default to 0 when absent.
const REQUIRED_FIELDS = [
  'operator',
  'payer',
  'receiver',
  'token',
  'maxAmount',
  'feeReceiver',
  'salt',
] as const

function toBigInt(value: unknown, field: string): bigint {
  try {
    return BigInt(value as string | number | bigint)
  } catch {
    throw new ValidationError(
      `Invalid ${field}: cannot convert ${JSON.stringify(value)} to bigint`,
    )
  }
}

function toUint(value: unknown, field: string): number {
  const n = Number(value)
  if (Number.isNaN(n)) {
    throw new ValidationError(
      `Invalid ${field}: cannot convert ${JSON.stringify(value)} to number`,
    )
  }
  return n
}

/**
 * Parse a JSON string or plain object into a typed PaymentInfo.
 * This does type coercion only — call `validatePaymentInfo` for business-rule checks.
 */
export function parsePaymentInfo(
  input: string | Record<string, unknown>,
): PaymentInfo {
  let parsed: Record<string, unknown>
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input)
    } catch {
      throw new ValidationError('Invalid JSON in PaymentInfo input')
    }
  } else {
    parsed = input
  }

  for (const field of REQUIRED_FIELDS) {
    if (parsed[field] === undefined || parsed[field] === null) {
      throw new ValidationError(
        `Missing required PaymentInfo field: '${field}'`,
        {
          metaMessages: [
            'Expected fields: operator, payer, receiver, token, maxAmount, preApprovalExpiry, authorizationExpiry, refundExpiry, minFeeBps, maxFeeBps, feeReceiver, salt',
          ],
        },
      )
    }
  }

  return {
    operator: parsed.operator as `0x${string}`,
    payer: parsed.payer as `0x${string}`,
    receiver: parsed.receiver as `0x${string}`,
    token: parsed.token as `0x${string}`,
    maxAmount: toBigInt(parsed.maxAmount, 'maxAmount'),
    preApprovalExpiry: toUint(
      parsed.preApprovalExpiry ?? 0,
      'preApprovalExpiry',
    ),
    authorizationExpiry: toUint(
      parsed.authorizationExpiry ?? 0,
      'authorizationExpiry',
    ),
    refundExpiry: toUint(parsed.refundExpiry ?? 0, 'refundExpiry'),
    minFeeBps: toUint(parsed.minFeeBps ?? 0, 'minFeeBps'),
    maxFeeBps: toUint(parsed.maxFeeBps ?? 0, 'maxFeeBps'),
    feeReceiver: parsed.feeReceiver as `0x${string}`,
    salt: toBigInt(parsed.salt, 'salt'),
  }
}

// ---------------------------------------------------------------------------
// EscrowPayload → PaymentInfo
// ---------------------------------------------------------------------------

/** Convert an EscrowPayload (from verified x402 payment) to a PaymentInfo struct. */
export function toPaymentInfo(escrowPayload: EscrowPayload): PaymentInfo {
  const pi = escrowPayload.paymentInfo
  return {
    operator: pi.operator,
    payer: escrowPayload.authorization.from,
    receiver: pi.receiver,
    token: pi.token,
    maxAmount: BigInt(pi.maxAmount),
    preApprovalExpiry: pi.preApprovalExpiry,
    authorizationExpiry: pi.authorizationExpiry,
    refundExpiry: pi.refundExpiry,
    minFeeBps: pi.minFeeBps,
    maxFeeBps: pi.maxFeeBps,
    feeReceiver: pi.feeReceiver,
    salt: BigInt(pi.salt),
  }
}
