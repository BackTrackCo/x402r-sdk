import { describe, expect, it } from 'vitest'
import { paymentOperatorAbi } from '../src/abis/generated.js'
import {
  BASIS_POINTS,
  MAX_UINT32,
  MAX_UINT48,
  type PaymentInfo,
  PaymentState,
  RequestStatus,
} from '../src/types/index.js'

// ---------------------------------------------------------------------------
// ABI Structural Alignment
// ---------------------------------------------------------------------------
// Extract the PaymentInfo tuple from the `authorize` function's first param.
// If a field is added/renamed in contracts, this test catches it at build time.

const authorizeFn = paymentOperatorAbi.find(
  (item) => item.type === 'function' && item.name === 'authorize',
)
if (!authorizeFn || authorizeFn.type !== 'function') {
  throw new Error('authorize function not found in paymentOperatorAbi')
}

const paymentInfoParam = authorizeFn.inputs[0]
if (!paymentInfoParam || !('components' in paymentInfoParam)) {
  throw new Error('PaymentInfo tuple not found as first param of authorize')
}

const abiFields = paymentInfoParam.components.map((c) => ({
  name: c.name,
  type: c.type,
}))

describe('PaymentInfo ABI alignment', () => {
  const expectedFields = [
    'operator',
    'payer',
    'receiver',
    'token',
    'maxAmount',
    'preApprovalExpiry',
    'authorizationExpiry',
    'refundExpiry',
    'minFeeBps',
    'maxFeeBps',
    'feeReceiver',
    'salt',
  ] as const

  it('has matching field names with ABI', () => {
    const abiFieldNames = abiFields.map((f) => f.name)
    expect(abiFieldNames).toEqual([...expectedFields])
  })

  it('has the correct number of fields', () => {
    expect(abiFields).toHaveLength(expectedFields.length)
  })

  it('address fields map to Address type', () => {
    const addressFields = abiFields
      .filter((f) => f.type === 'address')
      .map((f) => f.name)
    expect(addressFields).toEqual([
      'operator',
      'payer',
      'receiver',
      'token',
      'feeReceiver',
    ])
  })

  it('numeric fields have expected ABI types', () => {
    const numericFields = abiFields.filter((f) => f.type !== 'address')
    expect(numericFields).toEqual([
      { name: 'maxAmount', type: 'uint120' },
      { name: 'preApprovalExpiry', type: 'uint48' },
      { name: 'authorizationExpiry', type: 'uint48' },
      { name: 'refundExpiry', type: 'uint48' },
      { name: 'minFeeBps', type: 'uint16' },
      { name: 'maxFeeBps', type: 'uint16' },
      { name: 'salt', type: 'uint256' },
    ])
  })

  // Compile-time type check — this block will fail to compile if PaymentInfo
  // drifts from the expected shape. No runtime assertion needed.
  it('PaymentInfo interface has correct field types (compile-time)', () => {
    const _check: PaymentInfo = {
      operator: '0x0000000000000000000000000000000000000000',
      payer: '0x0000000000000000000000000000000000000000',
      receiver: '0x0000000000000000000000000000000000000000',
      token: '0x0000000000000000000000000000000000000000',
      maxAmount: 0n,
      preApprovalExpiry: 0n,
      authorizationExpiry: 0n,
      refundExpiry: 0n,
      minFeeBps: 0,
      maxFeeBps: 0,
      feeReceiver: '0x0000000000000000000000000000000000000000',
      salt: 0n,
    }
    expect(_check).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// PaymentState
// ---------------------------------------------------------------------------

describe('PaymentState', () => {
  it('has exactly 5 states', () => {
    expect(Object.keys(PaymentState)).toHaveLength(5)
  })

  it('values are sequential uint8 (0-4)', () => {
    expect(PaymentState.NonExistent).toBe(0)
    expect(PaymentState.InEscrow).toBe(1)
    expect(PaymentState.Released).toBe(2)
    expect(PaymentState.Settled).toBe(3)
    expect(PaymentState.Expired).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// RequestStatus
// ---------------------------------------------------------------------------

describe('RequestStatus', () => {
  it('has exactly 4 statuses', () => {
    expect(Object.keys(RequestStatus)).toHaveLength(4)
  })

  it('values are sequential uint8 (0-3)', () => {
    expect(RequestStatus.Pending).toBe(0)
    expect(RequestStatus.Approved).toBe(1)
    expect(RequestStatus.Denied).toBe(2)
    expect(RequestStatus.Cancelled).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('Constants', () => {
  it('MAX_UINT32 is 2^32 - 1', () => {
    expect(MAX_UINT32).toBe(2n ** 32n - 1n)
  })

  it('MAX_UINT48 is 2^48 - 1', () => {
    expect(MAX_UINT48).toBe(2n ** 48n - 1n)
  })

  it('BASIS_POINTS is 10,000', () => {
    expect(BASIS_POINTS).toBe(10_000)
  })
})
