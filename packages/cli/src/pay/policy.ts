import type { PaymentRequirements } from '@x402/core/types'
import { Malformed402Error, MaxAmountExceededError } from '../errors.js'

/**
 * Pick a single `accepts[]` entry from a 402 response. Enforces the rule that
 * when a merchant offers multiple options the caller must disambiguate with
 * `--chain`.
 */
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
      `no accepts[] entry matches --chain ${chainFilter}; offered: ${accepts
        .map((a) => a.network)
        .join(', ')}`,
    )
  }
  return match
}

/**
 * Guard against paying more than the caller authorized. Compares atomic token
 * units as BigInt — both values are opaque strings on the wire.
 */
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
