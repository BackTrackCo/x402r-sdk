import {
  approveRefundWithSignature,
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

    request: (paymentInfo, amount, nonce) =>
      requestRefund(requireWallet(config), {
        contractAddress: refundRequestAddress,
        paymentInfo,
        amount,
        nonce,
      }),

    cancel: (paymentInfo, nonce) =>
      cancelRefundRequest(requireWallet(config), {
        contractAddress: refundRequestAddress,
        paymentInfo,
        nonce,
      }),

    deny: (paymentInfo, nonce) =>
      denyRefundRequest(requireWallet(config), {
        contractAddress: refundRequestAddress,
        paymentInfo,
        nonce,
      }),

    refuse: (paymentInfo, nonce) =>
      refuseRefundRequest(requireWallet(config), {
        contractAddress: refundRequestAddress,
        paymentInfo,
        nonce,
      }),

    approveWithSignature: (paymentInfo, nonce, amount, expiry, signature) =>
      approveRefundWithSignature(requireWallet(config), {
        contractAddress: refundRequestAddress,
        paymentInfo,
        nonce,
        amount,
        expiry,
        signature,
      }),

    // -----------------------------------------------------------------------
    // Dispute read ops (refundRequestAddress)
    // -----------------------------------------------------------------------

    get: (paymentInfo, nonce) =>
      getRefundRequest(publicClient, {
        contractAddress: refundRequestAddress,
        paymentInfo,
        nonce,
      }),

    getByKey: (compositeKey) =>
      getRefundRequestByKey(publicClient, {
        contractAddress: refundRequestAddress,
        compositeKey,
      }),

    getStatus: (paymentInfo, nonce) =>
      getRefundRequestStatus(publicClient, {
        contractAddress: refundRequestAddress,
        paymentInfo,
        nonce,
      }),

    has: (paymentInfo, nonce) =>
      hasRefundRequest(publicClient, {
        contractAddress: refundRequestAddress,
        paymentInfo,
        nonce,
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

    getCancelCount: (paymentInfo, nonce) =>
      getCancelCount(publicClient, {
        contractAddress: refundRequestAddress,
        paymentInfo,
        nonce,
      }),

    getCancelledAmount: (paymentInfo, nonce, cancelIndex) =>
      getCancelledAmount(publicClient, {
        contractAddress: refundRequestAddress,
        paymentInfo,
        nonce,
        cancelIndex,
      }),
  }
}
