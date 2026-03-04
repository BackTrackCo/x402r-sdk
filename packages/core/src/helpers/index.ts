import type { Address } from 'viem'
import { fromNetworkId, getChainConfig } from '../config/index.js'
import { ValidationError } from '../errors/validation.js'
import type { EscrowExtra, RefundableOverrides } from './types.js'

export type { EscrowExtra, RefundableOverrides } from './types.js'

export function refundable<T extends { network: string }>(
  option: T,
  operatorAddress: Address,
  overrides?: RefundableOverrides,
): T & { extra: EscrowExtra & Record<string, unknown> } {
  const {
    minFeeBps = 0,
    maxFeeBps = 0,
    feeReceiver: feeReceiverOverride,
    escrowAddress: escrowOverride,
    tokenCollector: tokenCollectorOverride,
    extra: extraFields,
  } = overrides ?? {}

  if (minFeeBps < 0 || minFeeBps > 10000) {
    throw new ValidationError('minFeeBps must be between 0 and 10000', {
      details: `Got ${minFeeBps}`,
    })
  }
  if (maxFeeBps < 0 || maxFeeBps > 10000) {
    throw new ValidationError('maxFeeBps must be between 0 and 10000', {
      details: `Got ${maxFeeBps}`,
    })
  }
  if (minFeeBps > maxFeeBps) {
    throw new ValidationError('minFeeBps must be <= maxFeeBps', {
      details: `minFeeBps=${minFeeBps}, maxFeeBps=${maxFeeBps}`,
    })
  }

  const chainId = fromNetworkId(option.network)
  const chainConfig = getChainConfig(chainId)
  const feeReceiver = feeReceiverOverride ?? operatorAddress

  const escrowExtra: EscrowExtra = {
    escrowAddress: escrowOverride ?? chainConfig.authCaptureEscrow,
    operatorAddress,
    tokenCollector: tokenCollectorOverride ?? chainConfig.tokenCollector,
    minFeeBps,
    maxFeeBps,
    feeReceiver,
  }

  return {
    ...option,
    extra: { ...escrowExtra, ...extraFields },
  }
}
