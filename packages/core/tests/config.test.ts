import { describe, expect, it } from 'vitest'
import {
  authCaptureEscrow,
  ConfigError,
  conditions,
  factories,
  fromNetworkId,
  getChainConfig,
  getCollectorAddress,
  getConditionSingletons,
  getFactoryAddress,
  getFactoryAddresses,
  isSupportedChain,
  protocolFeeConfig,
  receiverRefundCollector,
  supportedChainIds,
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

describe('named address constants match getChainConfig()', () => {
  for (const chainId of supportedChainIds) {
    it(`chain ${chainId}`, () => {
      const config = getChainConfig(chainId)
      expect(config.authCaptureEscrow).toBe(authCaptureEscrow)
      expect(config.protocolFeeConfig).toBe(protocolFeeConfig)
      expect(config.receiverRefundCollector).toBe(receiverRefundCollector)
      expect(config.factories).toEqual(factories)
      expect(config.conditions).toEqual(conditions)
    })
  }
})

describe('collectors', () => {
  for (const chainId of supportedChainIds) {
    it(`chain ${chainId} exposes eip3009 + permit2 collectors`, () => {
      const config = getChainConfig(chainId)
      expect(config.collectors.eip3009).toMatch(/^0x[0-9a-fA-F]{40}$/)
      expect(config.collectors.permit2).toMatch(/^0x[0-9a-fA-F]{40}$/)
      // eip3009 collector and permit2 collector are distinct canonical addresses
      expect(config.collectors.eip3009).not.toBe(config.collectors.permit2)
    })
  }
})

describe('getCollectorAddress', () => {
  it('returns the canonical address for a supported chain', () => {
    const config = getChainConfig(8453)
    expect(getCollectorAddress(8453, 'eip3009')).toBe(config.collectors.eip3009)
    expect(getCollectorAddress(8453, 'permit2')).toBe(config.collectors.permit2)
  })

  it('throws ConfigError for unknown chain', () => {
    expect(() => getCollectorAddress(999999, 'eip3009')).toThrow(ConfigError)
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
