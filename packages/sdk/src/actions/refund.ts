import {
  approvePostEscrowRefund,
  approveRefund,
  cancelRefundRequest,
  denyRefundRequest,
  getCancelCount,
  getCancelledAmount,
  getOperatorRefundRequests,
  getPayerRefundRequests,
  getPostEscrowRefundAllowance,
  getReceiverRefundRequests,
  getRefundRequest,
  getRefundRequestByKey,
  getRefundRequestStatus,
  getStoredPaymentInfo,
  hasRefundRequest,
  refundInEscrow,
  refundPostEscrow,
  refuseRefundRequest,
  requestRefund,
} from '@x402r/core'
import type { RefundActions, ResolvedConfig } from '../types.js'
import { requireWallet } from './utils.js'

export function createRefundActions(config: ResolvedConfig): RefundActions {
  const { publicClient, refundRequestAddress, operatorAddress } = config

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

    approve: (paymentInfo, nonce, amount) =>
      approveRefund(requireWallet(config), {
        contractAddress: refundRequestAddress,
        paymentInfo,
        nonce,
        amount,
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

    // -----------------------------------------------------------------------
    // Budget ops (receiverRefundCollector)
    // -----------------------------------------------------------------------

    approveBudget: (token, amount) =>
      approvePostEscrowRefund(requireWallet(config), {
        token,
        collectorAddress: config.chainConfig.receiverRefundCollector,
        amount,
      }),

    getBudget: (token, owner) =>
      getPostEscrowRefundAllowance(publicClient, {
        token,
        owner,
        collectorAddress: config.chainConfig.receiverRefundCollector,
      }),

    refundInEscrow: (paymentInfo, amount) =>
      refundInEscrow(requireWallet(config), {
        operatorAddress,
        paymentInfo,
        amount,
      }),

    refundPostEscrow: (paymentInfo, amount, tokenCollector, collectorData) =>
      refundPostEscrow(requireWallet(config), {
        operatorAddress,
        paymentInfo,
        amount,
        tokenCollector,
        collectorData,
      }),
  }
}
