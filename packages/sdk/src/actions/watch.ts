import { paymentOperatorAbi, refundRequestAbi } from '@x402r/core'
import type { ResolvedConfig, WatchActions } from '../types.js'

export function createWatchActions(config: ResolvedConfig): WatchActions {
  return {
    onPayment(callback: (log: unknown) => void): () => void {
      const unwatchAuth = config.publicClient.watchContractEvent({
        address: config.operatorAddress,
        abi: paymentOperatorAbi,
        eventName: 'AuthorizeExecuted',
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
        eventName: 'CaptureExecuted',
        onLogs: (logs) => logs.forEach(callback),
      })
      return () => {
        unwatchAuth()
        unwatchCharge()
        unwatchRelease()
      }
    },
    onRefundRequest(callback: (log: unknown) => void): () => void {
      if (!config.refundRequestAddress) return () => {}
      const unwatch = config.publicClient.watchContractEvent({
        address: config.refundRequestAddress,
        abi: refundRequestAbi,
        onLogs: (logs) => logs.forEach(callback),
      })
      return unwatch
    },
    onRefundExecuted(callback: (log: unknown) => void): () => void {
      const unwatchInEscrow = config.publicClient.watchContractEvent({
        address: config.operatorAddress,
        abi: paymentOperatorAbi,
        eventName: 'VoidExecuted',
        onLogs: (logs) => logs.forEach(callback),
      })
      const unwatchPostEscrow = config.publicClient.watchContractEvent({
        address: config.operatorAddress,
        abi: paymentOperatorAbi,
        eventName: 'RefundExecuted',
        onLogs: (logs) => logs.forEach(callback),
      })
      return () => {
        unwatchInEscrow()
        unwatchPostEscrow()
      }
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
