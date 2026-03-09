import { paymentOperatorAbi, signatureRefundRequestAbi } from '@x402r/core'
import type { ResolvedConfig, WatchActions } from '../types.js'

export function createWatchActions(config: ResolvedConfig): WatchActions {
  return {
    onPayment(callback: (log: unknown) => void): () => void {
      const unwatchAuth = config.publicClient.watchContractEvent({
        address: config.operatorAddress,
        abi: paymentOperatorAbi,
        eventName: 'AuthorizationCreated',
        onLogs: (logs) => logs.forEach(callback),
      })
      const unwatchCharge = config.publicClient.watchContractEvent({
        address: config.operatorAddress,
        abi: paymentOperatorAbi,
        eventName: 'ChargeExecuted',
        onLogs: (logs) => logs.forEach(callback),
      })
      const unwatchRelease = config.publicClient.watchContractEvent({
        address: config.operatorAddress,
        abi: paymentOperatorAbi,
        eventName: 'ReleaseExecuted',
        onLogs: (logs) => logs.forEach(callback),
      })
      return () => {
        unwatchAuth()
        unwatchCharge()
        unwatchRelease()
      }
    },
    onRefundRequest(callback: (log: unknown) => void): () => void {
      const unwatch = config.publicClient.watchContractEvent({
        address: config.refundRequestAddress,
        abi: signatureRefundRequestAbi,
        onLogs: (logs) => logs.forEach(callback),
      })
      return unwatch
    },
    onFeeDistribution(callback: (log: unknown) => void): () => void {
      const unwatch = config.publicClient.watchContractEvent({
        address: config.operatorAddress,
        abi: paymentOperatorAbi,
        eventName: 'FeesDistributed',
        onLogs: (logs) => logs.forEach(callback),
      })
      return unwatch
    },
  }
}
