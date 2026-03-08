import { NotImplementedError } from '@x402r/core'
import type {
  EscrowActions,
  EvidenceActions,
  FreezeActions,
  RefundActions,
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

export function createRefundActions(_config: ResolvedConfig): RefundActions {
  return {
    request: () => stub('refund'),
    cancel: () => stub('refund'),
    deny: () => stub('refund'),
    refuse: () => stub('refund'),
    approveWithSignature: () => stub('refund'),
    get: () => stub('refund'),
    getByKey: () => stub('refund'),
    getStatus: () => stub('refund'),
    has: () => stub('refund'),
    getStoredPaymentInfo: () => stub('refund'),
    getPayerRequests: () => stub('refund'),
    getReceiverRequests: () => stub('refund'),
    getOperatorRequests: () => stub('refund'),
    getCancelCount: () => stub('refund'),
    getCancelledAmount: () => stub('refund'),
    approveBudget: () => stub('refund'),
    getBudget: () => stub('refund'),
    refundInEscrow: () => stub('refund'),
    refundPostEscrow: () => stub('refund'),
  }
}

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
