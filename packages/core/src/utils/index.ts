/**
 * Shared utilities for X402r SDK
 * @module utils
 */

import { keccak256, encodeAbiParameters, toHex } from 'viem';
import type { PaymentInfo } from '../types/index.js';

/**
 * EIP-712 typehash for PaymentInfo struct
 *
 * Computed as: keccak256("PaymentInfo(address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt)")
 */
export const PAYMENT_INFO_TYPEHASH = keccak256(
  toHex(
    'PaymentInfo(address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt)'
  )
);

/**
 * ABI parameter types for PaymentInfo struct encoding
 */
const paymentInfoAbiParams: readonly { name: string; type: string }[] = [
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
];

/**
 * ABI parameter types for final hash encoding (chainId, escrow, paymentInfoHash)
 */
const finalHashAbiParams: readonly { name: string; type: string }[] = [
  { name: 'chainId', type: 'uint256' },
  { name: 'escrow', type: 'address' },
  { name: 'paymentInfoHash', type: 'bytes32' },
];

/**
 * Compute the payment info hash as used by the escrow contract
 *
 * The hash is computed in two steps:
 * 1. Hash the PaymentInfo struct with its typehash
 * 2. Hash the result with chainId and escrow address
 *
 * This matches the Solidity implementation:
 * ```solidity
 * bytes32 paymentInfoHash = keccak256(abi.encode(PAYMENT_INFO_TYPEHASH, paymentInfo));
 * return keccak256(abi.encode(block.chainid, address(this), paymentInfoHash));
 * ```
 *
 * @param paymentInfo - The payment information struct
 * @param escrowAddress - The escrow contract address
 * @param chainId - The chain ID (e.g., 84532 for Base Sepolia)
 * @returns The bytes32 hash
 *
 * @example
 * ```typescript
 * const hash = computePaymentInfoHash(
 *   paymentInfo,
 *   '0xb9488351E48b23D798f24e8174514F28B741Eb4f',
 *   84532
 * );
 * ```
 */
export function computePaymentInfoHash(
  paymentInfo: PaymentInfo,
  escrowAddress: `0x${string}`,
  chainId: number
): `0x${string}` {
  // Step 1: Encode and hash the PaymentInfo struct with typehash
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
    BigInt(paymentInfo.minFeeBps),
    BigInt(paymentInfo.maxFeeBps),
    paymentInfo.feeReceiver,
    paymentInfo.salt,
  ]);

  const paymentInfoHash = keccak256(encodedPaymentInfo);

  // Step 2: Encode and hash with chainId and escrow address
  const encodedFinal = encodeAbiParameters(finalHashAbiParams, [
    BigInt(chainId),
    escrowAddress,
    paymentInfoHash,
  ]);

  return keccak256(encodedFinal);
}
