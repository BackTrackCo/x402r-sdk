import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  extractArbiterIdentity,
  extractMerchantIdentity,
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
// extractMerchantIdentity
// ---------------------------------------------------------------------------

describe('extractMerchantIdentity', () => {
  const VALID_REGISTRY =
    'eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'

  it('extracts from valid 8004-reputation extension', () => {
    const result = extractMerchantIdentity({
      '8004-reputation': { agentId: 99, agentRegistry: VALID_REGISTRY },
    })
    expect(result).toEqual({ agentId: 99n, agentRegistry: VALID_REGISTRY })
  })

  it('handles bigint agentId', () => {
    const result = extractMerchantIdentity({
      '8004-reputation': {
        agentId: 5n,
        agentRegistry:
          'eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e',
      },
    })
    expect(result?.agentId).toBe(5n)
  })

  it('handles string-encoded agentId', () => {
    const result = extractMerchantIdentity({
      '8004-reputation': { agentId: '42', agentRegistry: VALID_REGISTRY },
    })
    expect(result?.agentId).toBe(42n)
  })

  it('rejects non-CAIP-10 agentRegistry', () => {
    expect(
      extractMerchantIdentity({
        '8004-reputation': { agentId: 1, agentRegistry: 'hello world' },
      }),
    ).toBeUndefined()
  })

  it('rejects agentRegistry missing chain prefix', () => {
    expect(
      extractMerchantIdentity({
        '8004-reputation': {
          agentId: 1,
          agentRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
        },
      }),
    ).toBeUndefined()
  })

  it('returns undefined when extensions is undefined', () => {
    expect(extractMerchantIdentity(undefined)).toBeUndefined()
  })

  it('returns undefined when 8004-reputation is missing', () => {
    expect(extractMerchantIdentity({ attestation: {} })).toBeUndefined()
  })

  it('returns undefined when agentId is missing', () => {
    expect(
      extractMerchantIdentity({
        '8004-reputation': { agentRegistry: VALID_REGISTRY },
      }),
    ).toBeUndefined()
  })

  it('returns undefined when agentRegistry is missing', () => {
    expect(
      extractMerchantIdentity({ '8004-reputation': { agentId: 42 } }),
    ).toBeUndefined()
  })

  it('returns undefined when 8004-reputation is not an object', () => {
    expect(
      extractMerchantIdentity({ '8004-reputation': 'invalid' }),
    ).toBeUndefined()
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
