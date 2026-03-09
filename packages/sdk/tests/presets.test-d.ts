import type { WalletClient } from 'viem'
import { describe, expectTypeOf, it } from 'vitest'
import type {
  ArbiterClient,
  MerchantClient,
  PayerClient,
} from '../src/types.js'

// ---------------------------------------------------------------------------
// Declare typed clients (no runtime — pure type-level tests)
// ---------------------------------------------------------------------------

declare const payer: PayerClient
declare const merchant: MerchantClient
declare const arbiter: ArbiterClient

// ---------------------------------------------------------------------------
// PayerClient
// ---------------------------------------------------------------------------

describe('PayerClient type narrowing', () => {
  it('config has WalletClient', () => {
    expectTypeOf(payer.config.walletClient).toEqualTypeOf<WalletClient>()
  })

  it('payment exposes read-only methods', () => {
    expectTypeOf(payer.payment.getState).toBeFunction()
    expectTypeOf(payer.payment.getAmounts).toBeFunction()
  })

  it('payment hides write methods', () => {
    // @ts-expect-error — payer cannot authorize
    payer.payment.authorize
    // @ts-expect-error — payer cannot charge
    payer.payment.charge
    // @ts-expect-error — payer cannot release
    payer.payment.release
  })

  it('refund exposes payer methods', () => {
    expectTypeOf(payer.refund.request).toBeFunction()
    expectTypeOf(payer.refund.cancel).toBeFunction()
  })

  it('refund hides non-payer methods', () => {
    // @ts-expect-error — payer cannot deny
    payer.refund.deny
    // @ts-expect-error — payer cannot refuse
    payer.refund.refuse
    // @ts-expect-error — payer cannot approveWithSignature
    payer.refund.approveWithSignature
    // @ts-expect-error — payer cannot getReceiverRequests
    payer.refund.getReceiverRequests
    // @ts-expect-error — payer cannot getOperatorRequests
    payer.refund.getOperatorRequests
    // @ts-expect-error — payer cannot approveBudget
    payer.refund.approveBudget
    // @ts-expect-error — payer cannot getBudget
    payer.refund.getBudget
    // @ts-expect-error — payer cannot refundInEscrow
    payer.refund.refundInEscrow
    // @ts-expect-error — payer cannot refundPostEscrow
    payer.refund.refundPostEscrow
  })

  it('operator hides fee calculation methods', () => {
    // @ts-expect-error — payer cannot calculateFees
    payer.operator.calculateFees
    // @ts-expect-error — payer cannot calculateOperatorFeeBps
    payer.operator.calculateOperatorFeeBps
    // @ts-expect-error — payer cannot calculateProtocolFeeBps
    payer.operator.calculateProtocolFeeBps
    // @ts-expect-error — payer cannot getAuthorizedFees
    payer.operator.getAuthorizedFees
    // @ts-expect-error — payer cannot getAccumulatedProtocolFees
    payer.operator.getAccumulatedProtocolFees
    // @ts-expect-error — payer cannot distributeFees
    payer.operator.distributeFees
  })

  it('freeze hides write methods', () => {
    // @ts-expect-error — payer cannot freeze
    payer.freeze!.freeze
    // @ts-expect-error — payer cannot unfreeze
    payer.freeze!.unfreeze
  })
})

// ---------------------------------------------------------------------------
// MerchantClient
// ---------------------------------------------------------------------------

describe('MerchantClient type narrowing', () => {
  it('payment exposes all methods', () => {
    expectTypeOf(merchant.payment.authorize).toBeFunction()
    expectTypeOf(merchant.payment.charge).toBeFunction()
    expectTypeOf(merchant.payment.release).toBeFunction()
    expectTypeOf(merchant.payment.getState).toBeFunction()
    expectTypeOf(merchant.payment.getAmounts).toBeFunction()
  })

  it('refund exposes merchant methods', () => {
    expectTypeOf(merchant.refund.refuse).toBeFunction()
    expectTypeOf(merchant.refund.approveBudget).toBeFunction()
    expectTypeOf(merchant.refund.getBudget).toBeFunction()
    expectTypeOf(merchant.refund.refundInEscrow).toBeFunction()
    expectTypeOf(merchant.refund.refundPostEscrow).toBeFunction()
  })

  it('refund hides non-merchant methods', () => {
    // @ts-expect-error — merchant cannot request
    merchant.refund.request
    // @ts-expect-error — merchant cannot cancel
    merchant.refund.cancel
    // @ts-expect-error — merchant cannot deny
    merchant.refund.deny
    // @ts-expect-error — merchant cannot approveWithSignature
    merchant.refund.approveWithSignature
    // @ts-expect-error — merchant cannot getPayerRequests
    merchant.refund.getPayerRequests
    // @ts-expect-error — merchant cannot getOperatorRequests
    merchant.refund.getOperatorRequests
  })

  it('operator exposes all methods', () => {
    expectTypeOf(merchant.operator.calculateFees).toBeFunction()
    expectTypeOf(merchant.operator.distributeFees).toBeFunction()
  })

  it('freeze hides write methods', () => {
    // @ts-expect-error — merchant cannot freeze
    merchant.freeze!.freeze
    // @ts-expect-error — merchant cannot unfreeze
    merchant.freeze!.unfreeze
  })
})

// ---------------------------------------------------------------------------
// ArbiterClient
// ---------------------------------------------------------------------------

describe('ArbiterClient type narrowing', () => {
  it('payment hides write methods', () => {
    // @ts-expect-error — arbiter cannot authorize
    arbiter.payment.authorize
    // @ts-expect-error — arbiter cannot charge
    arbiter.payment.charge
    // @ts-expect-error — arbiter cannot release
    arbiter.payment.release
  })

  it('refund exposes arbiter methods', () => {
    expectTypeOf(arbiter.refund.deny).toBeFunction()
    expectTypeOf(arbiter.refund.approveWithSignature).toBeFunction()
    expectTypeOf(arbiter.refund.getOperatorRequests).toBeFunction()
  })

  it('refund hides non-arbiter methods', () => {
    // @ts-expect-error — arbiter cannot request
    arbiter.refund.request
    // @ts-expect-error — arbiter cannot cancel
    arbiter.refund.cancel
    // @ts-expect-error — arbiter cannot refuse
    arbiter.refund.refuse
    // @ts-expect-error — arbiter cannot approveBudget
    arbiter.refund.approveBudget
    // @ts-expect-error — arbiter cannot getBudget
    arbiter.refund.getBudget
    // @ts-expect-error — arbiter cannot refundInEscrow
    arbiter.refund.refundInEscrow
    // @ts-expect-error — arbiter cannot refundPostEscrow
    arbiter.refund.refundPostEscrow
  })

  it('freeze exposes full FreezeActions', () => {
    expectTypeOf(arbiter.freeze!.freeze).toBeFunction()
    expectTypeOf(arbiter.freeze!.unfreeze).toBeFunction()
    expectTypeOf(arbiter.freeze!.isFrozen).toBeFunction()
  })

  it('operator hides fee calculation methods', () => {
    // @ts-expect-error — arbiter cannot calculateFees
    arbiter.operator.calculateFees
    // @ts-expect-error — arbiter cannot distributeFees
    arbiter.operator.distributeFees
  })
})

// ---------------------------------------------------------------------------
// Extend preserves narrowing
// ---------------------------------------------------------------------------

describe('extend preserves narrowing', () => {
  it('payer.extend adds namespace and preserves narrowing', () => {
    const extended = payer.extend(() => ({ custom: { foo: 42 } }))
    expectTypeOf(extended.custom.foo).toBeNumber()
    // @ts-expect-error — still narrowed after extend
    extended.payment.authorize
  })

  it('merchant.extend adds namespace and preserves narrowing', () => {
    const extended = merchant.extend(() => ({ custom: { bar: 'hi' } }))
    expectTypeOf(extended.custom.bar).toBeString()
    // @ts-expect-error — still narrowed after extend
    extended.refund.request
  })

  it('arbiter.extend adds namespace and preserves narrowing', () => {
    const extended = arbiter.extend(() => ({ custom: { baz: true } }))
    expectTypeOf(extended.custom.baz).toBeBoolean()
    // @ts-expect-error — still narrowed after extend
    extended.payment.authorize
  })
})
