import { encodeAbiParameters, keccak256 } from 'viem'
import { describe, expect, it } from 'vitest'
import {
  computeEscrowNonce,
  computePaymentInfoHash,
  PAYMENT_INFO_TYPEHASH,
} from '../src/hashing/index.js'
import type { PaymentInfo } from '../src/types/index.js'

// --- Scheme-style nonce (inline reimplementation) ---

// Scheme computes PAYMENT_INFO_TYPEHASH using TextEncoder (Uint8Array)
// while SDK uses toHex (string). Both should produce the same keccak256.
const SCHEME_PAYMENT_INFO_TYPEHASH = keccak256(
  new TextEncoder().encode(
    'PaymentInfo(address operator,address payer,address receiver,address token,uint120 maxAmount,uint48 preApprovalExpiry,uint48 authorizationExpiry,uint48 refundExpiry,uint16 minFeeBps,uint16 maxFeeBps,address feeReceiver,uint256 salt)',
  ),
)

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

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
      ZERO_ADDRESS,
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

// --- Test fixtures ---

const escrowAddress = '0xb9488351E48b23D798f24e8174514F28B741Eb4f' as const
const chainId = 84532

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

  it('computeEscrowNonce matches scheme nonce for identical inputs', () => {
    const sdkNonce = computeEscrowNonce(chainId, escrowAddress, sdkPaymentInfo)
    const schemeNonce = schemeComputeEscrowNonce(
      chainId,
      escrowAddress,
      schemePaymentInfo,
    )
    expect(sdkNonce).toBe(schemeNonce)
  })

  it('computePaymentInfoHash with zero payer matches scheme nonce', () => {
    const zeroPayer: PaymentInfo = {
      ...sdkPaymentInfo,
      payer: ZERO_ADDRESS,
    }
    const sdkHash = computePaymentInfoHash(chainId, escrowAddress, zeroPayer)
    const schemeNonce = schemeComputeEscrowNonce(
      chainId,
      escrowAddress,
      schemePaymentInfo,
    )
    expect(sdkHash).toBe(schemeNonce)
  })

  it('both produce matching results for different chainId', () => {
    const sdkNonce = computeEscrowNonce(1, escrowAddress, sdkPaymentInfo)
    const schemeNonce = schemeComputeEscrowNonce(
      1,
      escrowAddress,
      schemePaymentInfo,
    )
    expect(sdkNonce).toBe(schemeNonce)
    const baseSepoliaNonce = computeEscrowNonce(
      chainId,
      escrowAddress,
      sdkPaymentInfo,
    )
    expect(sdkNonce).not.toBe(baseSepoliaNonce)
  })

  it('both produce matching results for different escrow address', () => {
    const altEscrow = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const
    const sdkNonce = computeEscrowNonce(chainId, altEscrow, sdkPaymentInfo)
    const schemeNonce = schemeComputeEscrowNonce(
      chainId,
      altEscrow,
      schemePaymentInfo,
    )
    expect(sdkNonce).toBe(schemeNonce)
  })

  it('both produce matching results for different maxAmount', () => {
    const altSdkInfo = { ...sdkPaymentInfo, maxAmount: 2000000n }
    const altSchemeInfo = { ...schemePaymentInfo, maxAmount: '2000000' }
    const sdkNonce = computeEscrowNonce(chainId, escrowAddress, altSdkInfo)
    const schemeNonce = schemeComputeEscrowNonce(
      chainId,
      escrowAddress,
      altSchemeInfo,
    )
    expect(sdkNonce).toBe(schemeNonce)
  })
})
