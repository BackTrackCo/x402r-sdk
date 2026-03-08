import { describe, expect, it } from 'vitest'
import {
  ConfigError,
  fromNetworkId,
  getChainConfig,
  getConditionSingletons,
  getFactoryAddress,
  getFactoryAddresses,
  isSupportedChain,
  toNetworkId,
} from '../src/index.js'

describe('getChainConfig', () => {
  it('returns config for known chain', () => {
    const config = getChainConfig(84532)
    expect(config.name).toBe('Base Sepolia')
    expect(config.chainId).toBe(84532)
  })

  it('throws ConfigError for unknown chain', () => {
    expect(() => getChainConfig(999999)).toThrow(ConfigError)
  })
})

describe('isSupportedChain', () => {
  it('returns true for supported chain', () => {
    expect(isSupportedChain(84532)).toBe(true)
    expect(isSupportedChain(8453)).toBe(true)
  })

  it('returns false for unsupported chain', () => {
    expect(isSupportedChain(999999)).toBe(false)
  })

  it('handles edge cases', () => {
    expect(isSupportedChain(NaN)).toBe(false)
    expect(isSupportedChain(-1)).toBe(false)
    expect(isSupportedChain(0)).toBe(false)
  })
})

describe('getFactoryAddresses', () => {
  it('returns factories for supported chain', () => {
    const factories = getFactoryAddresses(84532)
    expect(factories).toHaveProperty('paymentOperator')
    expect(factories).toHaveProperty('escrowPeriod')
  })

  it('throws ConfigError for unsupported chain', () => {
    expect(() => getFactoryAddresses(999999)).toThrow(ConfigError)
  })
})

describe('getFactoryAddress', () => {
  it('returns address for valid factory key', () => {
    const addr = getFactoryAddress(84532, 'paymentOperator')
    expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/)
  })

  it('throws ConfigError for unsupported chain', () => {
    expect(() => getFactoryAddress(999999, 'paymentOperator')).toThrow(
      ConfigError,
    )
  })
})

describe('getConditionSingletons', () => {
  it('returns conditions for supported chain', () => {
    const conditions = getConditionSingletons(84532)
    expect(conditions).toHaveProperty('payer')
    expect(conditions).toHaveProperty('receiver')
    expect(conditions).toHaveProperty('alwaysTrue')
  })

  it('throws ConfigError for unsupported chain', () => {
    expect(() => getConditionSingletons(999999)).toThrow(ConfigError)
  })
})

describe('toNetworkId / fromNetworkId', () => {
  it('roundtrips correctly', () => {
    expect(fromNetworkId(toNetworkId(84532))).toBe(84532)
  })

  it('fromNetworkId rejects invalid format', () => {
    expect(() => fromNetworkId('bad')).toThrow(ConfigError)
    expect(() => fromNetworkId('eip155:')).toThrow(ConfigError)
    expect(() => fromNetworkId('eip155:abc')).toThrow(ConfigError)
  })
})
