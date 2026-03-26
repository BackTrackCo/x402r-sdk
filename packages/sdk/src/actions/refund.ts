import {
  cancelRefundRequest,
  denyRefundRequest,
  getCancelCount,
  getCancelledAmount,
  getOperatorRefundRequests,
  getPayerRefundRequests,
  getReceiverRefundRequests,
  getRefundRequest,
  getRefundRequestByKey,
  getRefundRequestStatus,
  getStoredPaymentInfo,
  hasRefundRequest,
  refuseRefundRequest,
  requestRefund,
} from '@x402r/core'
import type { Address } from 'viem'
import type { RefundActions, ResolvedConfig } from '../types.js'
import { requireWallet } from './utils.js'

export function createRefundActions(
  config: ResolvedConfig,
  refundRequestAddress: Address,
): RefundActions {
  const { publicClient } = config

  return {
    // -----------------------------------------------------------------------
    // Dispute write ops (refundRequestAddress)
    // -----------------------------------------------------------------------

    request: (paymentInfo, amount) =>
      requestRefund(requireWallet(config), {
        contractAddress: refundRequestAddress,
        paymentInfo,
        amount,
      }),

    cancel: (paymentInfo) =>
      cancelRefundRequest(requireWallet(config), {
        contractAddress: refundRequestAddress,
        paymentInfo,
      }),

    deny: (paymentInfo) =>
      denyRefundRequest(requireWallet(config), {
        contractAddress: refundRequestAddress,
        paymentInfo,
      }),

    refuse: (paymentInfo) =>
      refuseRefundRequest(requireWallet(config), {
        contractAddress: refundRequestAddress,
        paymentInfo,
      }),

    // -----------------------------------------------------------------------
    // Dispute read ops (refundRequestAddress)
    // -----------------------------------------------------------------------

    get: (paymentInfo) =>
      getRefundRequest(publicClient, {
        contractAddress: refundRequestAddress,
        paymentInfo,
      }),

    getByKey: (paymentInfoHash) =>
      getRefundRequestByKey(publicClient, {
        contractAddress: refundRequestAddress,
        paymentInfoHash,
      }),

    getStatus: (paymentInfo) =>
      getRefundRequestStatus(publicClient, {
        contractAddress: refundRequestAddress,
        paymentInfo,
      }),

    has: (paymentInfo) =>
      hasRefundRequest(publicClient, {
        contractAddress: refundRequestAddress,
        paymentInfo,
      }),

    getStoredPaymentInfo: (paymentInfoHash) =>
      getStoredPaymentInfo(publicClient, {
        contractAddress: refundRequestAddress,
        paymentInfoHash,
      }),

    getPayerRequests: (payer, offset, count) =>
      getPayerRefundRequests(publicClient, {
        contractAddress: refundRequestAddress,
        payer,
        offset,
        count,
      }),

    getReceiverRequests: (receiver, offset, count) =>
      getReceiverRefundRequests(publicClient, {
        contractAddress: refundRequestAddress,
        receiver,
        offset,
        count,
      }),

    getOperatorRequests: (operator, offset, count) =>
      getOperatorRefundRequests(publicClient, {
        contractAddress: refundRequestAddress,
        operator,
        offset,
        count,
      }),

    getCancelCount: (paymentInfo) =>
      getCancelCount(publicClient, {
        contractAddress: refundRequestAddress,
        paymentInfo,
      }),

    getCancelledAmount: (paymentInfo, cancelIndex) =>
      getCancelledAmount(publicClient, {
        contractAddress: refundRequestAddress,
        paymentInfo,
        cancelIndex,
      }),
  }
}
