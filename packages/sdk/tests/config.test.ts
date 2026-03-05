import { ConfigError, getChainConfig } from '@x402r/core'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.js'
import {
  createMockPublicClient,
  createMockPublicClientNoChain,
  createMockWalletClient,
  MOCK_OPERATOR_ADDRESS,
} from './fixtures.js'

describe('resolveConfig', () => {
  it('reads chainId from publicClient.chain.id', () => {
    const publicClient = createMockPublicClient()
    const resolved = resolveConfig({
      publicClient,
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    expect(resolved.chainId).toBe(84532)
  })

  it('throws ConfigError when publicClient has no chain', () => {
    const publicClient = createMockPublicClientNoChain()

    expect(() =>
      resolveConfig({
        publicClient,
        operatorAddress: MOCK_OPERATOR_ADDRESS,
      }),
    ).toThrow(ConfigError)
  })

  it('throws ConfigError for unsupported chainId', () => {
    const publicClient = createMockPublicClient({
      chain: { id: 999999, name: 'Unknown' } as any,
    })

    expect(() =>
      resolveConfig({
        publicClient,
        operatorAddress: MOCK_OPERATOR_ADDRESS,
      }),
    ).toThrow(ConfigError)
  })

  it('walletClient is undefined in read-only mode', () => {
    const publicClient = createMockPublicClient()
    const resolved = resolveConfig({
      publicClient,
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    expect(resolved.walletClient).toBeUndefined()
  })

  it('walletClient is set when provided', () => {
    const publicClient = createMockPublicClient()
    const walletClient = createMockWalletClient()
    const resolved = resolveConfig({
      publicClient,
      walletClient,
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    expect(resolved.walletClient).toBe(walletClient)
  })

  it('chainConfig contains actual Base Sepolia addresses for chainId 84532', () => {
    const publicClient = createMockPublicClient()
    const resolved = resolveConfig({
      publicClient,
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    const expected = getChainConfig(84532)
    expect(resolved.chainConfig).toEqual(expected)
    expect(resolved.chainConfig.refundRequest).toBe(
      '0x1C2Ab244aC8bDdDB74d43389FF34B118aF2E90F4',
    )
    expect(resolved.chainConfig.tokenCollector).toBe(
      '0x5cA789000070DF15b4663DB64a50AeF5D49c5Ee0',
    )
    expect(resolved.chainConfig.refundRequestEvidence).toBe(
      '0x917317BBBBe1b9b53BD0ceD4C7b7386Dbd1727ea',
    )
  })

  it('preserves operatorAddress from config', () => {
    const publicClient = createMockPublicClient()
    const resolved = resolveConfig({
      publicClient,
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    expect(resolved.operatorAddress).toBe(MOCK_OPERATOR_ADDRESS)
  })

  it('error message includes supported chains', () => {
    const publicClient = createMockPublicClient({
      chain: { id: 999999, name: 'Unknown' } as any,
    })

    try {
      resolveConfig({
        publicClient,
        operatorAddress: MOCK_OPERATOR_ADDRESS,
      })
      expect.fail('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError)
      expect((e as ConfigError).message).toContain('999999')
    }
  })
})
