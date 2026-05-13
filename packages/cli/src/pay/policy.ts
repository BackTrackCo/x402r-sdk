import type { PaymentRequirements } from '@x402/core/types'
import { Malformed402Error, MaxAmountExceededError } from '../errors.js'

type AssetTransferMethod = 'eip3009' | 'permit2'

interface PickAcceptOptions {
  chain?: string
  assetTransferMethod?: string
}

const VALID_ASSET_TRANSFER_METHODS: ReadonlySet<AssetTransferMethod> = new Set([
  'eip3009',
  'permit2',
])

/**
 * Pick a single `accepts[]` entry from a 402 response. Enforces the rule that
 * when a merchant offers multiple options the caller must disambiguate with
 * `--chain` and/or `--asset-transfer-method`.
 */
export function pickAccept(
  accepts: PaymentRequirements[],
  options: PickAcceptOptions,
): PaymentRequirements {
  if (accepts.length === 0) {
    throw new Malformed402Error('402 response has no accepts[] entries')
  }

  let pool = accepts

  if (options.chain) {
    pool = pool.filter((a) => a.network === options.chain)
    if (pool.length === 0) {
      throw new Malformed402Error(
        `no accepts[] entry matches --chain ${options.chain}; offered: ${accepts
          .map((a) => a.network)
          .join(', ')}`,
      )
    }
  }

  if (options.assetTransferMethod !== undefined) {
    if (
      !VALID_ASSET_TRANSFER_METHODS.has(
        options.assetTransferMethod as AssetTransferMethod,
      )
    ) {
      throw new Malformed402Error(
        `--asset-transfer-method must be 'eip3009' or 'permit2' (got '${options.assetTransferMethod}')`,
      )
    }
    const want = options.assetTransferMethod
    pool = pool.filter((a) => {
      const advertised =
        (a.extra as { assetTransferMethod?: string } | undefined)
          ?.assetTransferMethod ?? 'eip3009'
      return advertised === want
    })
    if (pool.length === 0) {
      throw new Malformed402Error(
        `no accepts[] entry matches --asset-transfer-method=${options.assetTransferMethod}; offered: ${accepts
          .map(
            (a) =>
              (a.extra as { assetTransferMethod?: string } | undefined)
                ?.assetTransferMethod ?? 'eip3009',
          )
          .join(', ')}`,
      )
    }
  }

  if (pool.length === 1) {
    return pool[0]!
  }

  // Multiple remain after filtering — caller didn't disambiguate enough.
  const networks = pool.map((a) => a.network).join(', ')
  throw new Malformed402Error(
    `402 offers ${pool.length} payment options; pass --chain <eip155:id> to pick one (remaining networks: ${networks})`,
  )
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
