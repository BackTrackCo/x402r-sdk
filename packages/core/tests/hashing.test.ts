import { describe, expect, it } from 'vitest'
import {
  computeEscrowNonce,
  computePaymentInfoHash,
  PAYMENT_INFO_TYPEHASH,
} from '../src/payment/hashing.js'
import {
  makePaymentInfo,
  TEST_CHAIN_ID,
  TEST_ESCROW_ADDRESS,
  zeroAddress,
} from './fixtures.js'

const samplePaymentInfo = makePaymentInfo()

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
})

// ---------------------------------------------------------------------------
// computePaymentInfoHash
// ---------------------------------------------------------------------------

describe('computePaymentInfoHash', () => {
  it('matches golden hash for reference PaymentInfo', () => {
    const hash = computePaymentInfoHash(
      TEST_CHAIN_ID,
      TEST_ESCROW_ADDRESS,
      samplePaymentInfo,
    )
    expect(hash).toBe(
      '0x6b28d39eba9622eaad35e4a6e7fa0c63c6b6c63c2faa08935a271c8bb38cebad',
    )
  })

  it('produces different hashes for different payment info', () => {
    const hash1 = computePaymentInfoHash(
      TEST_CHAIN_ID,
      TEST_ESCROW_ADDRESS,
      samplePaymentInfo,
    )
    const hash2 = computePaymentInfoHash(TEST_CHAIN_ID, TEST_ESCROW_ADDRESS, {
      ...samplePaymentInfo,
      maxAmount: 2000000n,
    })
    expect(hash1).not.toBe(hash2)
  })

  it('produces different hashes for different escrow addresses', () => {
    const hash1 = computePaymentInfoHash(
      TEST_CHAIN_ID,
      TEST_ESCROW_ADDRESS,
      samplePaymentInfo,
    )
    const hash2 = computePaymentInfoHash(
      TEST_CHAIN_ID,
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      samplePaymentInfo,
    )
    expect(hash1).not.toBe(hash2)
  })

  it('produces different hashes for different chain IDs', () => {
    const hash1 = computePaymentInfoHash(
      TEST_CHAIN_ID,
      TEST_ESCROW_ADDRESS,
      samplePaymentInfo,
    )
    const hash2 = computePaymentInfoHash(
      1,
      TEST_ESCROW_ADDRESS,
      samplePaymentInfo,
    )
    expect(hash1).not.toBe(hash2)
  })
})

// ---------------------------------------------------------------------------
// computeEscrowNonce
// ---------------------------------------------------------------------------

describe('computeEscrowNonce', () => {
  it('is payer-agnostic (ignores payer field)', () => {
    const n1 = computeEscrowNonce(
      TEST_CHAIN_ID,
      TEST_ESCROW_ADDRESS,
      samplePaymentInfo,
    )
    const n2 = computeEscrowNonce(TEST_CHAIN_ID, TEST_ESCROW_ADDRESS, {
      ...samplePaymentInfo,
      payer: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    })
    expect(n1).toBe(n2)
  })

  it('matches computePaymentInfoHash with zero payer', () => {
    const nonce = computeEscrowNonce(
      TEST_CHAIN_ID,
      TEST_ESCROW_ADDRESS,
      samplePaymentInfo,
    )
    const hash = computePaymentInfoHash(TEST_CHAIN_ID, TEST_ESCROW_ADDRESS, {
      ...samplePaymentInfo,
      payer: zeroAddress,
    })
    expect(nonce).toBe(hash)
  })

  it('produces different nonces for different maxAmount', () => {
    const n1 = computeEscrowNonce(
      TEST_CHAIN_ID,
      TEST_ESCROW_ADDRESS,
      samplePaymentInfo,
    )
    const n2 = computeEscrowNonce(TEST_CHAIN_ID, TEST_ESCROW_ADDRESS, {
      ...samplePaymentInfo,
      maxAmount: 2000000n,
    })
    expect(n1).not.toBe(n2)
  })
})
