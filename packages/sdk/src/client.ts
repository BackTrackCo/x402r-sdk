import { createEvidenceActions } from './actions/evidence.js'
import { createFeeActions } from './actions/fee.js'
import { createFreezeActions } from './actions/freeze.js'
import { createOperatorActions } from './actions/operator.js'
import { createPaymentActions } from './actions/payment.js'
import { createRefundActions } from './actions/refund.js'
import { resolveConfig } from './config.js'
import type { X402r, X402rConfig } from './types.js'

export function createX402r(userConfig: X402rConfig): X402r {
  const config = resolveConfig(userConfig)

  const client: X402r = {
    payment: createPaymentActions(config),
    refund: createRefundActions(config),
    evidence: createEvidenceActions(config),
    freeze: createFreezeActions(config),
    operator: createOperatorActions(config),
    fee: createFeeActions(config),
    config,
    extend(fn) {
      const extensions = fn(client)
      return Object.assign(Object.create(client), extensions) as X402r &
        typeof extensions
    },
  }

  return client
}
