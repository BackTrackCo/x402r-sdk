import { encodeAbiParameters, keccak256 } from 'viem'
import { describe, expect, it } from 'vitest'
import {
  computePaymentInfoHash,
  PAYMENT_INFO_TYPEHASH,
} from '../src/payment/hashing.js'
import type { PaymentInfo } from '../src/types/index.js'
import { TEST_CHAIN_ID, TEST_ESCROW_ADDRESS, zeroAddress } from './fixtures.js'

// --- Scheme-style nonce (inline reimplementation) ---

// Scheme computes PAYMENT_INFO_TYPEHASH using TextEncoder (Uint8Array)
// while SDK uses toHex (string). Both should produce the same keccak256.
const SCHEME_PAYMENT_INFO_TYPEHASH = keccak256(
  new TextEncoder().encode(
    'PaymentInfo(address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt)',
  ),
)

function schemeComputeEscrowNonce(
  chainId: number,
  escrowAddress: `0x${string}`,
  paymentInfo: {
    operator: `0x${string}`
    receiver: `0x${string}`
    token: `0x${string}`
    maxAmount: string
    preApprovalExpiry: number
    authorizationExpiry: number
    refundExpiry: number
    minFeeBps: number
    maxFeeBps: number
    feeReceiver: `0x${string}`
    salt: string
  },
): `0x${string}` {
  const paymentInfoEncoded = encodeAbiParameters(
    [
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
    ],
    [
      SCHEME_PAYMENT_INFO_TYPEHASH,
      paymentInfo.operator,
      zeroAddress,
      paymentInfo.receiver,
      paymentInfo.token,
      BigInt(paymentInfo.maxAmount),
      paymentInfo.preApprovalExpiry,
      paymentInfo.authorizationExpiry,
      paymentInfo.refundExpiry,
      paymentInfo.minFeeBps,
      paymentInfo.maxFeeBps,
      paymentInfo.feeReceiver,
      BigInt(paymentInfo.salt),
    ],
  )
  const paymentInfoHash = keccak256(paymentInfoEncoded)

  const outerEncoded = encodeAbiParameters(
    [
      { name: 'chainId', type: 'uint256' },
      { name: 'escrow', type: 'address' },
      { name: 'paymentInfoHash', type: 'bytes32' },
    ],
    [BigInt(chainId), escrowAddress, paymentInfoHash],
  )

  return keccak256(outerEncoded)
}

// --- Test fixtures (local — scheme uses string-typed fields) ---

const sdkPaymentInfo: PaymentInfo = {
  operator: '0x1234567890123456789012345678901234567890',
  payer: '0x2345678901234567890123456789012345678901',
  receiver: '0x3456789012345678901234567890123456789012',
  token: '0x4567890123456789012345678901234567890123',
  maxAmount: 1000000n,
  preApprovalExpiry: 1735689600,
  authorizationExpiry: 1735689600,
  refundExpiry: 1738368000,
  minFeeBps: 0,
  maxFeeBps: 500,
  feeReceiver: '0x5678901234567890123456789012345678901234',
  salt: 0x123456789abcdefn,
}

const schemePaymentInfo = {
  operator: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  receiver: '0x3456789012345678901234567890123456789012' as `0x${string}`,
  token: '0x4567890123456789012345678901234567890123' as `0x${string}`,
  maxAmount: '1000000',
  preApprovalExpiry: 1735689600,
  authorizationExpiry: 1735689600,
  refundExpiry: 1738368000,
  minFeeBps: 0,
  maxFeeBps: 500,
  feeReceiver: '0x5678901234567890123456789012345678901234' as `0x${string}`,
  salt: '0x0123456789abcdef',
}

// --- Tests ---

describe('Cross-repo nonce consistency', () => {
  it('PAYMENT_INFO_TYPEHASH matches between SDK (toHex) and scheme (TextEncoder)', () => {
    expect(PAYMENT_INFO_TYPEHASH).toBe(SCHEME_PAYMENT_INFO_TYPEHASH)
  })

  it('computePaymentInfoHash with zero payer matches scheme nonce', () => {
    const zeroPayer: PaymentInfo = {
      ...sdkPaymentInfo,
      payer: zeroAddress,
    }
    const sdkHash = computePaymentInfoHash(
      TEST_CHAIN_ID,
      TEST_ESCROW_ADDRESS,
      zeroPayer,
    )
    const schemeNonce = schemeComputeEscrowNonce(
      TEST_CHAIN_ID,
      TEST_ESCROW_ADDRESS,
      schemePaymentInfo,
    )
    expect(sdkHash).toBe(schemeNonce)
  })
})
