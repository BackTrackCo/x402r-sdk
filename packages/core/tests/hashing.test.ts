import { describe, expect, it } from 'vitest'
import {
  computeEscrowNonce,
  computePaymentInfoHash,
  PAYMENT_INFO_TYPEHASH,
} from '../src/hashing/index.js'
import type { PaymentInfo } from '../src/types/index.js'

const samplePaymentInfo: PaymentInfo = {
  operator: '0x1234567890123456789012345678901234567890',
  payer: '0x2345678901234567890123456789012345678901',
  receiver: '0x3456789012345678901234567890123456789012',
  token: '0x4567890123456789012345678901234567890123',
  maxAmount: 1000000n,
  preApprovalExpiry: 0,
  authorizationExpiry: 1735689600,
  refundExpiry: 1738368000,
  minFeeBps: 0,
  maxFeeBps: 500,
  feeReceiver: '0x5678901234567890123456789012345678901234',
  salt: 0x123456789abcdefn,
}

const escrowAddress = '0xb9488351E48b23D798f24e8174514F28B741Eb4f' as const
const chainId = 84532

// ---------------------------------------------------------------------------
// PAYMENT_INFO_TYPEHASH
// ---------------------------------------------------------------------------

describe('PAYMENT_INFO_TYPEHASH', () => {
  it('matches golden value', () => {
    // keccak256 of the PaymentInfo struct signature — stable across all implementations
    expect(PAYMENT_INFO_TYPEHASH).toBe(
      '0xae68ac7ce30c86ece8196b61a7c486d8f0061f575037fbd34e7fe4e2820c6591',
    )
  })

  it('is a bytes32 hash', () => {
    expect(PAYMENT_INFO_TYPEHASH).toMatch(/^0x[a-fA-F0-9]{64}$/)
  })
})

// ---------------------------------------------------------------------------
// computePaymentInfoHash
// ---------------------------------------------------------------------------

describe('computePaymentInfoHash', () => {
  it('returns a bytes32 hash', () => {
    const hash = computePaymentInfoHash(
      chainId,
      escrowAddress,
      samplePaymentInfo,
    )
    expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/)
  })

  it('is deterministic', () => {
    const hash1 = computePaymentInfoHash(
      chainId,
      escrowAddress,
      samplePaymentInfo,
    )
    const hash2 = computePaymentInfoHash(
      chainId,
      escrowAddress,
      samplePaymentInfo,
    )
    expect(hash1).toBe(hash2)
  })

  it('produces different hashes for different payment info', () => {
    const hash1 = computePaymentInfoHash(
      chainId,
      escrowAddress,
      samplePaymentInfo,
    )
    const hash2 = computePaymentInfoHash(chainId, escrowAddress, {
      ...samplePaymentInfo,
      maxAmount: 2000000n,
    })
    expect(hash1).not.toBe(hash2)
  })

  it('produces different hashes for different escrow addresses', () => {
    const hash1 = computePaymentInfoHash(
      chainId,
      escrowAddress,
      samplePaymentInfo,
    )
    const hash2 = computePaymentInfoHash(
      chainId,
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      samplePaymentInfo,
    )
    expect(hash1).not.toBe(hash2)
  })

  it('produces different hashes for different chain IDs', () => {
    const hash1 = computePaymentInfoHash(
      chainId,
      escrowAddress,
      samplePaymentInfo,
    )
    const hash2 = computePaymentInfoHash(1, escrowAddress, samplePaymentInfo)
    expect(hash1).not.toBe(hash2)
  })
})

// ---------------------------------------------------------------------------
// computeEscrowNonce
// ---------------------------------------------------------------------------

describe('computeEscrowNonce', () => {
  it('returns a bytes32 hash', () => {
    const nonce = computeEscrowNonce(chainId, escrowAddress, samplePaymentInfo)
    expect(nonce).toMatch(/^0x[a-fA-F0-9]{64}$/)
  })

  it('is deterministic', () => {
    const n1 = computeEscrowNonce(chainId, escrowAddress, samplePaymentInfo)
    const n2 = computeEscrowNonce(chainId, escrowAddress, samplePaymentInfo)
    expect(n1).toBe(n2)
  })

  it('is payer-agnostic (ignores payer field)', () => {
    const n1 = computeEscrowNonce(chainId, escrowAddress, samplePaymentInfo)
    const n2 = computeEscrowNonce(chainId, escrowAddress, {
      ...samplePaymentInfo,
      payer: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    })
    expect(n1).toBe(n2)
  })

  it('matches computePaymentInfoHash with zero payer', () => {
    const nonce = computeEscrowNonce(chainId, escrowAddress, samplePaymentInfo)
    const hash = computePaymentInfoHash(chainId, escrowAddress, {
      ...samplePaymentInfo,
      payer: '0x0000000000000000000000000000000000000000',
    })
    expect(nonce).toBe(hash)
  })

  it('produces different nonces for different maxAmount', () => {
    const n1 = computeEscrowNonce(chainId, escrowAddress, samplePaymentInfo)
    const n2 = computeEscrowNonce(chainId, escrowAddress, {
      ...samplePaymentInfo,
      maxAmount: 2000000n,
    })
    expect(n1).not.toBe(n2)
  })
})
