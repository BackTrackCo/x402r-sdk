import type { EscrowPayload } from '@x402r/evm'
import { ValidationError } from '../errors/index.js'
import type { PaymentInfo } from '../types/index.js'

// ---------------------------------------------------------------------------
// Wire-format → PaymentInfo
// ---------------------------------------------------------------------------

const REQUIRED_FIELDS = [
  'operator',
  'payer',
  'receiver',
  'token',
  'maxAmount',
  'feeReceiver',
  'salt',
] as const

/** Parse a JSON string or plain object into a typed PaymentInfo. */
export function parsePaymentInfo(
  input: string | Record<string, unknown>,
): PaymentInfo {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input

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
    maxAmount: BigInt(parsed.maxAmount),
    preApprovalExpiry: Number(parsed.preApprovalExpiry ?? 0),
    authorizationExpiry: Number(parsed.authorizationExpiry ?? 0),
    refundExpiry: Number(parsed.refundExpiry ?? 0),
    minFeeBps: Number(parsed.minFeeBps ?? 0),
    maxFeeBps: Number(parsed.maxFeeBps ?? 0),
    feeReceiver: parsed.feeReceiver as `0x${string}`,
    salt: BigInt(parsed.salt),
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
