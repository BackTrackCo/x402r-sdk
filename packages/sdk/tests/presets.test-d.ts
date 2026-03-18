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
    void payer.payment.authorize
    // @ts-expect-error — payer cannot charge
    void payer.payment.charge
    // @ts-expect-error — payer cannot release
    void payer.payment.release
    // @ts-expect-error — payer cannot refundInEscrow
    void payer.payment.refundInEscrow
    // @ts-expect-error — payer cannot refundPostEscrow
    void payer.payment.refundPostEscrow
    // @ts-expect-error — payer cannot approvePostEscrowRefund
    void payer.payment.approvePostEscrowRefund
    // @ts-expect-error — payer cannot getPostEscrowRefundAllowance
    void payer.payment.getPostEscrowRefundAllowance
  })

  it('refund exposes payer methods', () => {
    expectTypeOf(payer.refund.request).toBeFunction()
    expectTypeOf(payer.refund.cancel).toBeFunction()
  })

  it('refund hides non-payer methods', () => {
    // @ts-expect-error — payer cannot deny
    void payer.refund.deny
    // @ts-expect-error — payer cannot refuse
    void payer.refund.refuse
    // @ts-expect-error — payer cannot approve
    void payer.refund.approve
    // @ts-expect-error — payer cannot getReceiverRequests
    void payer.refund.getReceiverRequests
    // @ts-expect-error — payer cannot getOperatorRequests
    void payer.refund.getOperatorRequests
  })

  it('operator hides fee calculation methods', () => {
    // @ts-expect-error — payer cannot calculateFees
    void payer.operator.calculateFees
    // @ts-expect-error — payer cannot calculateOperatorFeeBps
    void payer.operator.calculateOperatorFeeBps
    // @ts-expect-error — payer cannot calculateProtocolFeeBps
    void payer.operator.calculateProtocolFeeBps
    // @ts-expect-error — payer cannot getAuthorizedFees
    void payer.operator.getAuthorizedFees
    // @ts-expect-error — payer cannot getAccumulatedProtocolFees
    void payer.operator.getAccumulatedProtocolFees
    // @ts-expect-error — payer cannot distributeFees
    void payer.operator.distributeFees
  })

  it('freeze exposes freeze + isFrozen, hides unfreeze', () => {
    expectTypeOf(payer.freeze!.freeze).toBeFunction()
    expectTypeOf(payer.freeze!.isFrozen).toBeFunction()
    // @ts-expect-error — payer cannot unfreeze
    void payer.freeze!.unfreeze
  })
})

// ---------------------------------------------------------------------------
// MerchantClient
// ---------------------------------------------------------------------------

describe('MerchantClient type narrowing', () => {
  it('payment exposes merchant methods', () => {
    expectTypeOf(merchant.payment.authorize).toBeFunction()
    expectTypeOf(merchant.payment.charge).toBeFunction()
    expectTypeOf(merchant.payment.release).toBeFunction()
    expectTypeOf(merchant.payment.getState).toBeFunction()
    expectTypeOf(merchant.payment.getAmounts).toBeFunction()
    expectTypeOf(merchant.payment.refundPostEscrow).toBeFunction()
    expectTypeOf(merchant.payment.approvePostEscrowRefund).toBeFunction()
    expectTypeOf(merchant.payment.getPostEscrowRefundAllowance).toBeFunction()
    // @ts-expect-error — merchant cannot refundInEscrow
    void merchant.payment.refundInEscrow
  })

  it('refund exposes merchant dispute methods', () => {
    expectTypeOf(merchant.refund.approve).toBeFunction()
    expectTypeOf(merchant.refund.refuse).toBeFunction()
    expectTypeOf(merchant.refund.get).toBeFunction()
    expectTypeOf(merchant.refund.getStatus).toBeFunction()
    expectTypeOf(merchant.refund.getReceiverRequests).toBeFunction()
  })

  it('refund hides non-merchant methods', () => {
    // @ts-expect-error — merchant cannot request
    void merchant.refund.request
    // @ts-expect-error — merchant cannot cancel
    void merchant.refund.cancel
    // @ts-expect-error — merchant cannot deny
    void merchant.refund.deny
    // @ts-expect-error — merchant cannot getPayerRequests
    void merchant.refund.getPayerRequests
    // @ts-expect-error — merchant cannot getOperatorRequests
    void merchant.refund.getOperatorRequests
  })

  it('operator exposes all methods', () => {
    expectTypeOf(merchant.operator.calculateFees).toBeFunction()
    expectTypeOf(merchant.operator.distributeFees).toBeFunction()
  })

  it('freeze hides write methods', () => {
    // @ts-expect-error — merchant cannot freeze
    void merchant.freeze!.freeze
    // @ts-expect-error — merchant cannot unfreeze
    void merchant.freeze!.unfreeze
  })
})

// ---------------------------------------------------------------------------
// ArbiterClient
// ---------------------------------------------------------------------------

describe('ArbiterClient type narrowing', () => {
  it('payment hides write methods', () => {
    // @ts-expect-error — arbiter cannot authorize
    void arbiter.payment.authorize
    // @ts-expect-error — arbiter cannot charge
    void arbiter.payment.charge
    // @ts-expect-error — arbiter cannot release
    void arbiter.payment.release
    // @ts-expect-error — arbiter cannot refundInEscrow
    void arbiter.payment.refundInEscrow
    // @ts-expect-error — arbiter cannot refundPostEscrow
    void arbiter.payment.refundPostEscrow
    // @ts-expect-error — arbiter cannot approvePostEscrowRefund
    void arbiter.payment.approvePostEscrowRefund
  })

  it('refund exposes arbiter methods', () => {
    expectTypeOf(arbiter.refund.deny).toBeFunction()
    expectTypeOf(arbiter.refund.approve).toBeFunction()
    expectTypeOf(arbiter.refund.getOperatorRequests).toBeFunction()
  })

  it('refund hides non-arbiter methods', () => {
    // @ts-expect-error — arbiter cannot request
    void arbiter.refund.request
    // @ts-expect-error — arbiter cannot cancel
    void arbiter.refund.cancel
    // @ts-expect-error — arbiter cannot refuse
    void arbiter.refund.refuse
  })

  it('freeze exposes unfreeze + isFrozen, hides freeze', () => {
    expectTypeOf(arbiter.freeze!.unfreeze).toBeFunction()
    expectTypeOf(arbiter.freeze!.isFrozen).toBeFunction()
    // @ts-expect-error — arbiter cannot freeze
    void arbiter.freeze!.freeze
  })

  it('operator exposes distributeFees but hides fee calculation', () => {
    expectTypeOf(arbiter.operator.distributeFees).toBeFunction()
    expectTypeOf(arbiter.operator.getAccumulatedProtocolFees).toBeFunction()
    // @ts-expect-error — arbiter cannot calculateFees
    void arbiter.operator.calculateFees
    // @ts-expect-error — arbiter cannot calculateOperatorFeeBps
    void arbiter.operator.calculateOperatorFeeBps
    // @ts-expect-error — arbiter cannot calculateProtocolFeeBps
    void arbiter.operator.calculateProtocolFeeBps
    // @ts-expect-error — arbiter cannot getAuthorizedFees
    void arbiter.operator.getAuthorizedFees
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
    void extended.payment.authorize
  })

  it('merchant.extend adds namespace and preserves narrowing', () => {
    const extended = merchant.extend(() => ({ custom: { bar: 'hi' } }))
    expectTypeOf(extended.custom.bar).toBeString()
    // @ts-expect-error — still narrowed after extend
    void extended.refund.request
  })

  it('arbiter.extend adds namespace and preserves narrowing', () => {
    const extended = arbiter.extend(() => ({ custom: { baz: true } }))
    expectTypeOf(extended.custom.baz).toBeBoolean()
    // @ts-expect-error — still narrowed after extend
    void extended.payment.authorize
  })
})
