import { fromNetworkId, getChainConfig } from '../config/index.js'
import { getTokenInfo } from '../config/tokens.js'
import { ConfigError } from '../errors/config.js'
import { ValidationError } from '../errors/validation.js'
import type { EscrowExtra, PaymentOption, RefundableOptions } from './types.js'

export type { EscrowExtra, PaymentOption, RefundableOptions } from './types.js'

export function refundable(options: RefundableOptions): PaymentOption {
  const {
    operatorAddress,
    network,
    token,
    minFeeBps = 0,
    maxFeeBps = 0,
    feeReceiver: feeReceiverOverride,
    name: nameOverride,
    version: versionOverride,
    extra: extraFields,
  } = options

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

  const chainId = fromNetworkId(network)
  const chainConfig = getChainConfig(chainId)

  const tokenInfo = getTokenInfo(chainId, token)
  const name = nameOverride ?? tokenInfo?.name
  const version = versionOverride ?? tokenInfo?.version

  if (!name || !version) {
    throw new ConfigError(
      `Could not resolve EIP-712 domain name/version for token ${token} on chain ${chainId}`,
      {
        metaMessages: [
          'Provide explicit `name` and `version` options for non-USDC tokens.',
        ],
      },
    )
  }

  const feeReceiver = feeReceiverOverride ?? operatorAddress

  const escrowExtra: EscrowExtra = {
    escrowAddress: chainConfig.authCaptureEscrow,
    operatorAddress,
    tokenCollector: chainConfig.tokenCollector,
    minFeeBps,
    maxFeeBps,
    feeReceiver,
    name,
    version,
  }

  return {
    network,
    token,
    extra: { ...escrowExtra, ...extraFields },
  }
}
