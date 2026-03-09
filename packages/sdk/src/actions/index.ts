import { NotImplementedError } from '@x402r/core'
import type {
  EscrowActions,
  EvidenceActions,
  FreezeActions,
  ResolvedConfig,
  WatchActions,
} from '../types.js'

function stub(group: string): never {
  throw new NotImplementedError(`${group} action group is not yet implemented`)
}

export { createOperatorActions } from './operator.js'
export { createPaymentActions } from './payment.js'

export function createEscrowActions(_config: ResolvedConfig): EscrowActions {
  return {
    isDuringEscrow: () => stub('escrow'),
    getAuthorizationTime: () => stub('escrow'),
    getDuration: () => stub('escrow'),
  }
}

export { createRefundActions } from './refund.js'

export function createEvidenceActions(
  _config: ResolvedConfig,
): EvidenceActions {
  return {
    submit: () => stub('evidence'),
    get: () => stub('evidence'),
    getBatch: () => stub('evidence'),
    count: () => stub('evidence'),
  }
}

export function createFreezeActions(_config: ResolvedConfig): FreezeActions {
  return {
    freeze: () => stub('freeze'),
    unfreeze: () => stub('freeze'),
    isFrozen: () => stub('freeze'),
  }
}

export function createWatchActions(_config: ResolvedConfig): WatchActions {
  return {
    onPayment: () => stub('watch'),
    onRefundRequest: () => stub('watch'),
    onFeeDistribution: () => stub('watch'),
  }
}
