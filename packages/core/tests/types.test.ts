import { describe, expect, it } from 'vitest'
import type {
  ConditionConfig,
  OperatorConfig,
  PaymentInfo,
} from '../src/types/index.js'

// ---------------------------------------------------------------------------
// Compile-Time Shape Tests
// ---------------------------------------------------------------------------
// These verify that ABI-derived types produce the expected shapes.
// If an ABI regen changes a field name or type, these will fail at compile time.
// No runtime ABI introspection needed — the types ARE the ABI.

describe('PaymentInfo (ABI-derived)', () => {
  it('satisfies expected shape (compile-time check)', () => {
    // abitype: address → `0x${string}`, uint120/uint256 → bigint, uint16/uint48 → number
    const _check: PaymentInfo = {
      operator: '0x0000000000000000000000000000000000000000',
      payer: '0x0000000000000000000000000000000000000000',
      receiver: '0x0000000000000000000000000000000000000000',
      token: '0x0000000000000000000000000000000000000000',
      maxAmount: 0n,
      preApprovalExpiry: 0,
      authorizationExpiry: 0,
      refundExpiry: 0,
      minFeeBps: 0,
      maxFeeBps: 0,
      feeReceiver: '0x0000000000000000000000000000000000000000',
      salt: 0n,
    }
    expect(_check).toBeDefined()
  })
})

describe('ConditionConfig (ABI-derived)', () => {
  it('satisfies expected shape (compile-time check)', () => {
    const _check: ConditionConfig = {
      authorizeCondition: '0x0000000000000000000000000000000000000000',
      authorizeRecorder: '0x0000000000000000000000000000000000000000',
      chargeCondition: '0x0000000000000000000000000000000000000000',
      chargeRecorder: '0x0000000000000000000000000000000000000000',
      releaseCondition: '0x0000000000000000000000000000000000000000',
      releaseRecorder: '0x0000000000000000000000000000000000000000',
      refundInEscrowCondition: '0x0000000000000000000000000000000000000000',
      refundInEscrowRecorder: '0x0000000000000000000000000000000000000000',
      refundPostEscrowCondition: '0x0000000000000000000000000000000000000000',
      refundPostEscrowRecorder: '0x0000000000000000000000000000000000000000',
    }
    expect(_check).toBeDefined()
  })
})

describe('OperatorConfig (ABI-derived)', () => {
  it('satisfies expected shape (compile-time check)', () => {
    const _check: OperatorConfig = {
      feeRecipient: '0x0000000000000000000000000000000000000000',
      feeCalculator: '0x0000000000000000000000000000000000000000',
      authorizeCondition: '0x0000000000000000000000000000000000000000',
      authorizeRecorder: '0x0000000000000000000000000000000000000000',
      chargeCondition: '0x0000000000000000000000000000000000000000',
      chargeRecorder: '0x0000000000000000000000000000000000000000',
      releaseCondition: '0x0000000000000000000000000000000000000000',
      releaseRecorder: '0x0000000000000000000000000000000000000000',
      refundInEscrowCondition: '0x0000000000000000000000000000000000000000',
      refundInEscrowRecorder: '0x0000000000000000000000000000000000000000',
      refundPostEscrowCondition: '0x0000000000000000000000000000000000000000',
      refundPostEscrowRecorder: '0x0000000000000000000000000000000000000000',
    }
    expect(_check).toBeDefined()
  })
})
