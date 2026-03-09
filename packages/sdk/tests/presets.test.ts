import { ValidationError } from '@x402r/core'
import { describe, expect, it } from 'vitest'
import {
  createArbiterClient,
  createMerchantClient,
  createPayerClient,
} from '../src/presets.js'
import { TEST_OPERATOR as operatorAddress, publicClient } from './fixtures.js'

const readOnlyConfig = {
  publicClient,
  operatorAddress,
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
})
