import { zeroAddress } from 'viem'
import { ValidationError } from '../errors/index.js'
import type { PaymentInfo } from '../types/index.js'

/**
 * Validate a PaymentInfo struct. Throws `ValidationError` on the first invalid field.
 * Payer may be zero (payer-agnostic payments). Expiry fields of 0 mean "not used".
 */
export function validatePaymentInfo(paymentInfo: PaymentInfo): void {
  if (paymentInfo.operator === zeroAddress) {
    throw new ValidationError('operator address must not be zero')
  }

  if (paymentInfo.receiver === zeroAddress) {
    throw new ValidationError('receiver address must not be zero')
  }

  if (paymentInfo.token === zeroAddress) {
    throw new ValidationError('token address must not be zero')
  }

  if (paymentInfo.feeReceiver === zeroAddress) {
    throw new ValidationError('feeReceiver address must not be zero')
  }

  if (paymentInfo.maxAmount <= 0n) {
    throw new ValidationError('maxAmount must be greater than 0')
  }

  if (paymentInfo.minFeeBps > paymentInfo.maxFeeBps) {
    throw new ValidationError(
      `minFeeBps (${paymentInfo.minFeeBps}) must be <= maxFeeBps (${paymentInfo.maxFeeBps})`,
    )
  }

  if (paymentInfo.maxFeeBps > 10000) {
    throw new ValidationError(
      `maxFeeBps (${paymentInfo.maxFeeBps}) must be <= 10000 (100%)`,
    )
  }

  const nowSeconds = Math.floor(Date.now() / 1000)

  if (
    paymentInfo.authorizationExpiry > 0 &&
    paymentInfo.authorizationExpiry <= nowSeconds
  ) {
    throw new ValidationError('authorizationExpiry is in the past')
  }

  if (
    paymentInfo.preApprovalExpiry > 0 &&
    paymentInfo.preApprovalExpiry <= nowSeconds
  ) {
    throw new ValidationError(
      'preApprovalExpiry is in the past. Note: this field doubles as ERC-3009 validBefore — ' +
        'an expired value will cause the authorization signature to be rejected',
    )
  }

  if (paymentInfo.refundExpiry > 0 && paymentInfo.refundExpiry <= nowSeconds) {
    throw new ValidationError('refundExpiry is in the past')
  }
}
