import type { Hex } from 'viem'
import { encodeAbiParameters, keccak256, toHex } from 'viem'
import type { PaymentInfo } from '../types/index.js'

// ---------------------------------------------------------------------------
// Companion types
// ---------------------------------------------------------------------------

export type ComputePaymentInfoHashReturnType = Hex

// ---------------------------------------------------------------------------
// Typehash
// ---------------------------------------------------------------------------

export const PAYMENT_INFO_TYPEHASH = keccak256(
  toHex(
    'PaymentInfo(address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt)',
  ),
)

// ---------------------------------------------------------------------------
// ABI params
// ---------------------------------------------------------------------------

const paymentInfoAbiParams = [
  { name: 'typehash', type: 'bytes32' },
  { name: 'operator', type: 'address' },
  { name: 'payer', type: 'address' },
  { name: 'receiver', type: 'address' },
  { name: 'token', type: 'address' },
  { name: 'maxAmount', type: 'uint120' },
  { name: 'preApprovalExpiry', type: 'uint48' },
  { name: 'authorizationExpiry', type: 'uint48' },
  { name: 'refundExpiry', type: 'uint48' },
  { name: 'minFeeBps', type: 'uint16' },
  { name: 'maxFeeBps', type: 'uint16' },
  { name: 'feeReceiver', type: 'address' },
  { name: 'salt', type: 'uint256' },
] as const

const finalHashAbiParams = [
  { name: 'chainId', type: 'uint256' },
  { name: 'escrow', type: 'address' },
  { name: 'paymentInfoHash', type: 'bytes32' },
] as const

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

// Matches Solidity:
//   bytes32 paymentInfoHash = keccak256(abi.encode(PAYMENT_INFO_TYPEHASH, paymentInfo));
//   return keccak256(abi.encode(block.chainid, address(this), paymentInfoHash));
export function computePaymentInfoHash(
  chainId: number,
  escrowAddress: `0x${string}`,
  paymentInfo: PaymentInfo,
): ComputePaymentInfoHashReturnType {
  const encodedPaymentInfo = encodeAbiParameters(paymentInfoAbiParams, [
    PAYMENT_INFO_TYPEHASH,
    paymentInfo.operator,
    paymentInfo.payer,
    paymentInfo.receiver,
    paymentInfo.token,
    paymentInfo.maxAmount,
    paymentInfo.preApprovalExpiry,
    paymentInfo.authorizationExpiry,
    paymentInfo.refundExpiry,
    paymentInfo.minFeeBps,
    paymentInfo.maxFeeBps,
    paymentInfo.feeReceiver,
    paymentInfo.salt,
  ])

  const paymentInfoHash = keccak256(encodedPaymentInfo)

  const encodedFinal = encodeAbiParameters(finalHashAbiParams, [
    BigInt(chainId),
    escrowAddress,
    paymentInfoHash,
  ])

  return keccak256(encodedFinal)
}
