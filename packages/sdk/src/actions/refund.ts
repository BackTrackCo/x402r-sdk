import {
  approveRefundBudget,
  approveRefundWithSignature,
  cancelRefundRequest,
  denyRefundRequest,
  getRefundBudget,
  getRefundRequest,
  getRefundRequestStatus,
  hasRefundRequest,
  refuseRefundRequest,
  requestRefund,
} from '@x402r/core'
import type { Address } from 'viem'
import type { RefundActions, ResolvedConfig } from '../types.js'
import { requireWalletClient } from './guards.js'

export function createRefundActions(config: ResolvedConfig): RefundActions {
  const { publicClient, operatorAddress, chainConfig } = config
  const refundRequestAddress = chainConfig.refundRequest

  return {
    hasRequest(paymentInfo, nonce) {
      return hasRefundRequest(
        publicClient,
        refundRequestAddress,
        paymentInfo,
        nonce,
      )
    },

    getRequestStatus(paymentInfo, nonce) {
      return getRefundRequestStatus(
        publicClient,
        refundRequestAddress,
        paymentInfo,
        nonce,
      )
    },

    getRequest(paymentInfo, nonce) {
      return getRefundRequest(
        publicClient,
        refundRequestAddress,
        paymentInfo,
        nonce,
      )
    },

    request(paymentInfo, amount, nonce) {
      const wc = requireWalletClient(config, 'refund.request')
      return requestRefund(wc, refundRequestAddress, paymentInfo, amount, nonce)
    },

    approveWithSignature(paymentInfo, nonce, amount, expiry, signature) {
      const wc = requireWalletClient(config, 'refund.approveWithSignature')
      return approveRefundWithSignature(
        wc,
        refundRequestAddress,
        paymentInfo,
        nonce,
        amount,
        expiry,
        signature,
      )
    },

    deny(paymentInfo, nonce) {
      const wc = requireWalletClient(config, 'refund.deny')
      return denyRefundRequest(wc, refundRequestAddress, paymentInfo, nonce)
    },

    refuse(paymentInfo, nonce) {
      const wc = requireWalletClient(config, 'refund.refuse')
      return refuseRefundRequest(wc, refundRequestAddress, paymentInfo, nonce)
    },

    cancel(paymentInfo, nonce) {
      const wc = requireWalletClient(config, 'refund.cancel')
      return cancelRefundRequest(wc, refundRequestAddress, paymentInfo, nonce)
    },

    getBudget(token: Address, owner: Address) {
      return getRefundBudget(publicClient, token, owner, operatorAddress)
    },

    approveBudget(token: Address, amount: bigint) {
      const wc = requireWalletClient(config, 'refund.approveBudget')
      return approveRefundBudget(wc, token, operatorAddress, amount)
    },
  }
}
