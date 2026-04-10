import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  extractArbiterIdentity,
  extractReputationRegistrations,
  fetchArbiterIdentity,
} from '../../src/actions/erc8004-helpers.js'

// ---------------------------------------------------------------------------
// extractArbiterIdentity
// ---------------------------------------------------------------------------

describe('extractArbiterIdentity', () => {
  const VALID_ADDRESS = '0x1111111111111111111111111111111111111111'

  it('extracts agentId and address from valid attestation', () => {
    const result = extractArbiterIdentity({
      arbiter: VALID_ADDRESS,
      agentId: 42,
      type: 'garbage-detection',
    })
    expect(result).toEqual({ agentId: 42n, address: VALID_ADDRESS })
  })

  it('handles bigint agentId', () => {
    const result = extractArbiterIdentity({
      arbiter: VALID_ADDRESS,
      agentId: 7n,
    })
    expect(result).toEqual({ agentId: 7n, address: VALID_ADDRESS })
  })

  it('handles string-encoded agentId (JSON deserialization)', () => {
    const result = extractArbiterIdentity({
      arbiter: VALID_ADDRESS,
      agentId: '42',
    })
    expect(result).toEqual({ agentId: 42n, address: VALID_ADDRESS })
  })

  it('returns undefined for float agentId', () => {
    expect(
      extractArbiterIdentity({ arbiter: VALID_ADDRESS, agentId: 1.5 }),
    ).toBeUndefined()
  })

  it('returns undefined for non-numeric string agentId', () => {
    expect(
      extractArbiterIdentity({ arbiter: VALID_ADDRESS, agentId: 'abc' }),
    ).toBeUndefined()
  })

  it('returns undefined when agentId is missing', () => {
    expect(
      extractArbiterIdentity({
        arbiter: VALID_ADDRESS,
        type: 'some-arbiter',
      }),
    ).toBeUndefined()
  })

  it('returns undefined when arbiter address is missing', () => {
    expect(extractArbiterIdentity({ agentId: 42 })).toBeUndefined()
  })

  it('returns undefined when arbiter address is invalid', () => {
    expect(
      extractArbiterIdentity({ arbiter: 'not-an-address', agentId: 42 }),
    ).toBeUndefined()
  })

  it('returns undefined for null input', () => {
    expect(extractArbiterIdentity(null)).toBeUndefined()
  })

  it('returns undefined for undefined input', () => {
    expect(extractArbiterIdentity(undefined)).toBeUndefined()
  })

  it('returns undefined for non-object input', () => {
    expect(extractArbiterIdentity('string')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// extractReputationRegistrations
// ---------------------------------------------------------------------------

describe('extractReputationRegistrations', () => {
  const EVM_REGISTRY = 'eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'
  const SOLANA_REGISTRY =
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:satiRkxEiwZ51cv8PRu8UMzuaqeaNU9jABo6oAFMsLe'

  it('extracts EVM registrations, skips non-numeric Solana agentIds', () => {
    const result = extractReputationRegistrations({
      reputation: {
        info: {
          version: '1.0.0',
          registrations: [
            { agentRegistry: EVM_REGISTRY, agentId: '42' },
            { agentRegistry: SOLANA_REGISTRY, agentId: '7xKXtg2CW87dNon' },
          ],
        },
      },
    })
    // Solana agentId is non-numeric (base58 mint address) → skipped by coerceAgentId
    expect(result).toEqual([{ agentId: 42n, agentRegistry: EVM_REGISTRY }])
  })

  it('extracts multiple EVM registrations', () => {
    const result = extractReputationRegistrations({
      reputation: {
        info: {
          version: '1.0.0',
          registrations: [
            { agentRegistry: EVM_REGISTRY, agentId: '42' },
            {
              agentRegistry:
                'eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e',
              agentId: '7',
            },
          ],
        },
      },
    })
    expect(result).toHaveLength(2)
    expect(result[0].agentId).toBe(42n)
    expect(result[1].agentId).toBe(7n)
  })

  it('handles single EVM registration', () => {
    const result = extractReputationRegistrations({
      reputation: {
        info: {
          version: '1.0.0',
          registrations: [{ agentRegistry: EVM_REGISTRY, agentId: '99' }],
        },
      },
    })
    expect(result).toHaveLength(1)
    expect(result[0].agentId).toBe(99n)
  })

  it('handles numeric agentId (coerces to bigint)', () => {
    const result = extractReputationRegistrations({
      reputation: {
        info: {
          registrations: [{ agentRegistry: EVM_REGISTRY, agentId: 5 }],
        },
      },
    })
    expect(result[0].agentId).toBe(5n)
  })

  it('skips entries with invalid agentId', () => {
    const result = extractReputationRegistrations({
      reputation: {
        info: {
          registrations: [
            { agentRegistry: EVM_REGISTRY, agentId: '42' },
            { agentRegistry: EVM_REGISTRY, agentId: 'not-a-number' },
          ],
        },
      },
    })
    expect(result).toHaveLength(1)
    expect(result[0].agentId).toBe(42n)
  })

  it('skips entries with empty agentRegistry', () => {
    const result = extractReputationRegistrations({
      reputation: {
        info: {
          registrations: [
            { agentRegistry: EVM_REGISTRY, agentId: '1' },
            { agentRegistry: '', agentId: '2' },
          ],
        },
      },
    })
    expect(result).toHaveLength(1)
  })

  it('returns empty array when extensions is undefined', () => {
    expect(extractReputationRegistrations(undefined)).toEqual([])
  })

  it('returns empty array when reputation key is missing', () => {
    expect(extractReputationRegistrations({ attestation: {} })).toEqual([])
  })

  it('returns empty array when info is missing', () => {
    expect(
      extractReputationRegistrations({ reputation: { schema: {} } }),
    ).toEqual([])
  })

  it('returns empty array when registrations is not an array', () => {
    expect(
      extractReputationRegistrations({
        reputation: { info: { registrations: 'invalid' } },
      }),
    ).toEqual([])
  })

  it('returns empty array when reputation is not an object', () => {
    expect(extractReputationRegistrations({ reputation: 'invalid' })).toEqual(
      [],
    )
  })
})

// ---------------------------------------------------------------------------
// fetchArbiterIdentity
// ---------------------------------------------------------------------------

describe('fetchArbiterIdentity', () => {
  const VALID_ADDRESS = '0x1111111111111111111111111111111111111111'

  afterEach(() => vi.restoreAllMocks())

  it('fetches and extracts arbiter identity', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          arbiter: VALID_ADDRESS,
          agentId: 7,
          type: 'garbage-detection',
        }),
        { status: 200 },
      ),
    )

    const result = await fetchArbiterIdentity('https://arbiter.example.com')

    expect(result).toEqual({ agentId: 7n, address: VALID_ADDRESS })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://arbiter.example.com/attest/identity',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('returns undefined on non-200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not found', { status: 404 }),
    )

    const result = await fetchArbiterIdentity('https://arbiter.example.com')
    expect(result).toBeUndefined()
  })

  it('handles trailing slash in arbiterUrl', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ arbiter: VALID_ADDRESS, agentId: 1 }), {
        status: 200,
      }),
    )

    await fetchArbiterIdentity('https://arbiter.example.com/')

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://arbiter.example.com/attest/identity',
      expect.anything(),
    )
  })

  it('returns undefined when arbiter has no agentId', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ arbiter: VALID_ADDRESS, type: 'some-arbiter' }),
        { status: 200 },
      ),
    )

    const result = await fetchArbiterIdentity('https://arbiter.example.com')
    expect(result).toBeUndefined()
  })

  it('propagates network errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('fetch failed'),
    )

    await expect(
      fetchArbiterIdentity('https://arbiter.example.com'),
    ).rejects.toThrow('fetch failed')
  })
})
