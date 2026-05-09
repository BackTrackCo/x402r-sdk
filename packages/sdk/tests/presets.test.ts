import { ValidationError } from '@x402r/core'
import { describe, expect, it } from 'vitest'
import {
  createArbiterClient,
  createMerchantClient,
  createPayerClient,
} from '../src/presets.js'
import {
  TEST_OPERATOR as operatorAddress,
  publicClient,
  TEST_REFUND_REQUEST as refundRequestAddress,
  walletClient,
} from './fixtures.js'

const readOnlyConfig = {
  publicClient,
  operatorAddress,
  refundRequestAddress,
  chainId: 84532 as const,
}

const writeConfig = {
  publicClient,
  walletClient,
  operatorAddress,
  refundRequestAddress,
  chainId: 84532 as const,
}

describe('presets', () => {
  it('createPayerClient throws ValidationError without walletClient', () => {
    expect(() => createPayerClient(readOnlyConfig)).toThrow(ValidationError)
    expect(() => createPayerClient(readOnlyConfig)).toThrow(
      'walletClient is required for createPayerClient',
    )
  })

  it('createMerchantClient throws ValidationError without walletClient', () => {
    expect(() => createMerchantClient(readOnlyConfig)).toThrow(ValidationError)
    expect(() => createMerchantClient(readOnlyConfig)).toThrow(
      'walletClient is required for createMerchantClient',
    )
  })

  it('createArbiterClient throws ValidationError without walletClient', () => {
    expect(() => createArbiterClient(readOnlyConfig)).toThrow(ValidationError)
    expect(() => createArbiterClient(readOnlyConfig)).toThrow(
      'walletClient is required for createArbiterClient',
    )
  })

  it('createPayerClient returns client with expected shape', () => {
    const client = createPayerClient(writeConfig)
    expect(client.config).toBeDefined()
    expect(client.config.walletClient).toBeDefined()
    expect(client.payment.getState).toBeTypeOf('function')
    expect(client.payment.getAmounts).toBeTypeOf('function')
    expect(client.refund!.request).toBeTypeOf('function')
    expect(client.evidence).toBeUndefined()
    expect(client.operator.getConfig).toBeTypeOf('function')
    expect(client.watch).toBeDefined()
    expect(client.canExecute).toBeTypeOf('function')
    expect(client.extend).toBeTypeOf('function')
  })

  it('createMerchantClient returns client with expected shape', () => {
    const client = createMerchantClient(writeConfig)
    expect(client.config).toBeDefined()
    expect(client.config.walletClient).toBeDefined()
    expect(client.payment.authorize).toBeTypeOf('function')
    expect(client.payment.charge).toBeTypeOf('function')
    expect(client.payment.approveRefundAllowance).toBeTypeOf('function')
    expect(client.payment.voidPayment).toBeTypeOf('function')
    expect(client.evidence).toBeUndefined()
    expect(client.operator.calculateFees).toBeTypeOf('function')
    expect(client.canExecute).toBeTypeOf('function')
    expect(client.extend).toBeTypeOf('function')
  })

  it('createArbiterClient returns client with expected shape', () => {
    const client = createArbiterClient(writeConfig)
    expect(client.config).toBeDefined()
    expect(client.config.walletClient).toBeDefined()
    expect(client.payment.getState).toBeTypeOf('function')
    expect(client.refund!.deny).toBeTypeOf('function')
    expect(client.refund!.refuse).toBeTypeOf('function')
    expect(client.evidence).toBeUndefined()
    expect(client.operator.distributeFees).toBeTypeOf('function')
    expect(client.operator.getAccumulatedProtocolFees).toBeTypeOf('function')
    expect(client.freeze).toBeUndefined() // no freezeAddress in config
    expect(client.canExecute).toBeTypeOf('function')
    expect(client.extend).toBeTypeOf('function')
  })
})
