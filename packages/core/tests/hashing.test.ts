import { describe, expect, it } from 'vitest'
import {
  computePaymentInfoHash,
  PAYMENT_INFO_TYPEHASH,
} from '../src/payment/hashing.js'
import {
  makePaymentInfo,
  TEST_CHAIN_ID,
  TEST_ESCROW_ADDRESS,
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
      '0x63b799e9bb087cf3850744ec28fef9f335dc9ae7de044918ecc86cae31ad1065',
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
