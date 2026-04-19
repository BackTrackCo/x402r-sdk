import { describe, expect, it } from 'vitest'
import { parseChainId, resolveChain } from '../src/chain.js'
import { Malformed402Error } from '../src/errors.js'

describe('parseChainId', () => {
  it('parses eip155 network strings', () => {
    expect(parseChainId('eip155:84532')).toBe(84532)
    expect(parseChainId('eip155:8453')).toBe(8453)
  })

  it('rejects non-eip155 namespaces', () => {
    expect(() => parseChainId('solana:mainnet')).toThrow(Malformed402Error)
    expect(() => parseChainId('cosmos:cosmoshub-4')).toThrow(Malformed402Error)
  })

  it('rejects malformed strings', () => {
    expect(() => parseChainId('eip155:')).toThrow(Malformed402Error)
    expect(() => parseChainId('eip155:abc')).toThrow(Malformed402Error)
    expect(() => parseChainId('8453')).toThrow(Malformed402Error)
  })
})

describe('resolveChain', () => {
  it('returns a known viem chain', () => {
    const chain = resolveChain(84532)
    expect(chain.id).toBe(84532)
    expect(chain.name.toLowerCase()).toContain('base sepolia')
  })

  it('overrides rpcUrls when --rpc is passed', () => {
    const chain = resolveChain(84532, 'https://example.rpc')
    expect(chain.rpcUrls.default.http[0]).toBe('https://example.rpc')
  })

  it('synthesizes an unknown chain when --rpc is provided', () => {
    const chain = resolveChain(999999, 'https://example.rpc')
    expect(chain.id).toBe(999999)
    expect(chain.rpcUrls.default.http[0]).toBe('https://example.rpc')
  })

  it('rejects an unknown chain without --rpc', () => {
    expect(() => resolveChain(999999)).toThrow(Malformed402Error)
  })
})
