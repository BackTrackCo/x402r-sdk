import type { Address } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import {
  createErc8004DiscoveryActions,
  createErc8004IdentityActions,
  createErc8004ReputationActions,
  DEFAULT_FEEDBACK_TAG1,
  DEFAULT_FEEDBACK_TAG2,
} from '../../src/actions/erc8004.js'
import { createX402r } from '../../src/client.js'
import { erc8004Actions } from '../../src/plugins/index.js'
import type { X402rConfig } from '../../src/types.js'
import {
  createTestConfig,
  TEST_OPERATOR as operatorAddress,
  publicClient,
  TEST_REFUND_REQUEST as refundRequestAddress,
  walletClient,
} from '../fixtures.js'

vi.mock('@x402r/erc8004/identity', () => ({
  registerAgent: vi.fn().mockResolvedValue('0xregisterhash'),
  verifyAgentId: vi.fn().mockResolvedValue(true),
  resolveAgent: vi.fn().mockResolvedValue({
    agentId: 42n,
    owner: '0x1111111111111111111111111111111111111111',
    agentWallet: '0x1111111111111111111111111111111111111111',
    agentURI: 'https://example.com/agent.json',
    ownerMismatch: false,
  }),
  isRegistered: vi.fn().mockResolvedValue(true),
}))

vi.mock('@x402r/erc8004/reputation', () => ({
  giveFeedback: vi.fn().mockResolvedValue('0xfeedbackhash'),
  getSummary: vi.fn().mockResolvedValue({
    count: 5n,
    summaryValue: 450n,
    summaryValueDecimals: 0,
  }),
}))

vi.mock('@x402r/erc8004/registration', () => ({
  resolveServiceEndpoint: vi.fn().mockResolvedValue({
    endpoint: 'https://arbiter.example.com',
    service: { name: 'x402r.arbiter', endpoint: 'https://arbiter.example.com' },
    agentURI: 'https://example.com/agent.json',
  }),
}))

const baseConfig: X402rConfig = {
  publicClient,
  walletClient,
  operatorAddress,
  refundRequestAddress,
  chainId: 84532,
}

const TEST_ADDR = '0x1111111111111111111111111111111111111111' as Address

// ---------------------------------------------------------------------------
// Plugin shape
// ---------------------------------------------------------------------------

describe('erc8004Actions plugin', () => {
  it('attaches identity, reputation, and discovery namespaces via extend', () => {
    const extended = createX402r(baseConfig).extend(erc8004Actions())
    expect(extended.identity).toBeDefined()
    expect(extended.reputation).toBeDefined()
    expect(extended.discovery).toBeDefined()
  })

  it('is chainable with other plugins', () => {
    const extended = createX402r(baseConfig)
      .extend(erc8004Actions())
      .extend(() => ({ custom: { hello: () => 'world' } }))
    expect(extended.identity).toBeDefined()
    expect(extended.custom.hello()).toBe('world')
  })

  it('does not override base client keys', () => {
    const extended = createX402r(baseConfig).extend(erc8004Actions())
    expect(extended.payment.authorize).toBeTypeOf('function')
    expect(extended.config.chainId).toBe(84532)
  })

  it('eagerly resolves registry addresses from chainId', async () => {
    const { registerAgent } = await import('@x402r/erc8004/identity')
    const extended = createX402r(baseConfig).extend(erc8004Actions())

    await extended.identity.register('https://example.com/agent.json')

    // Base Sepolia testnet identity registry
    expect(registerAgent).toHaveBeenCalledWith(
      baseConfig.walletClient,
      expect.objectContaining({
        registryAddress: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// Identity actions
// ---------------------------------------------------------------------------

describe('createErc8004IdentityActions', () => {
  it('register delegates to registerAgent with agentURI', async () => {
    const { registerAgent } = await import('@x402r/erc8004/identity')
    const config = createTestConfig()
    const actions = createErc8004IdentityActions(config)

    const result = await actions.register('https://example.com/agent.json')

    expect(result).toBe('0xregisterhash')
    expect(registerAgent).toHaveBeenCalledWith(config.walletClient, {
      agentURI: 'https://example.com/agent.json',
      registryAddress: undefined,
    })
  })

  it('register throws without walletClient', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createErc8004IdentityActions(config)
    await expect(actions.register()).rejects.toThrow('walletClient is required')
  })

  it('verifyAgentId delegates to core with agentId and address', async () => {
    const { verifyAgentId } = await import('@x402r/erc8004/identity')
    const config = createTestConfig()
    const actions = createErc8004IdentityActions(config)

    const result = await actions.verifyAgentId(42n, TEST_ADDR)

    expect(result).toBe(true)
    expect(verifyAgentId).toHaveBeenCalledWith(config.publicClient, {
      agentId: 42n,
      claimedAddress: TEST_ADDR,
      registryAddress: undefined,
    })
  })

  it('resolveAgent delegates to core with agentId', async () => {
    const { resolveAgent } = await import('@x402r/erc8004/identity')
    const config = createTestConfig()
    const actions = createErc8004IdentityActions(config)

    const result = await actions.resolveAgent(42n)

    expect(result.agentId).toBe(42n)
    expect(result.agentURI).toBe('https://example.com/agent.json')
    expect(resolveAgent).toHaveBeenCalledWith(config.publicClient, {
      agentId: 42n,
      registryAddress: undefined,
    })
  })

  it('isRegistered delegates to core with address', async () => {
    const { isRegistered } = await import('@x402r/erc8004/identity')
    const config = createTestConfig()
    const actions = createErc8004IdentityActions(config)

    const result = await actions.isRegistered(TEST_ADDR)

    expect(result).toBe(true)
    expect(isRegistered).toHaveBeenCalledWith(config.publicClient, {
      address: TEST_ADDR,
      registryAddress: undefined,
    })
  })

  it('passes registryAddress override to all calls', async () => {
    const { verifyAgentId } = await import('@x402r/erc8004/identity')
    const config = createTestConfig()
    const actions = createErc8004IdentityActions(config, {
      registryAddress: TEST_ADDR,
    })

    await actions.verifyAgentId(1n, TEST_ADDR)

    expect(verifyAgentId).toHaveBeenCalledWith(
      config.publicClient,
      expect.objectContaining({ registryAddress: TEST_ADDR }),
    )
  })
})

// ---------------------------------------------------------------------------
// Reputation actions
// ---------------------------------------------------------------------------

describe('createErc8004ReputationActions', () => {
  it('rate delegates to giveFeedback with default tags and score as bigint', async () => {
    const { giveFeedback } = await import('@x402r/erc8004/reputation')
    const config = createTestConfig()
    const actions = createErc8004ReputationActions(config)

    const result = await actions.rate(42n, 90)

    expect(result).toBe('0xfeedbackhash')
    expect(giveFeedback).toHaveBeenCalledWith(config.walletClient, {
      agentId: 42n,
      value: 90n,
      valueDecimals: 0,
      tag1: 'starred',
      tag2: 'x402',
      registryAddress: undefined,
    })
  })

  it('rate accepts boundary score 0', async () => {
    const config = createTestConfig()
    const actions = createErc8004ReputationActions(config)
    const result = await actions.rate(42n, 0)
    expect(result).toBe('0xfeedbackhash')
  })

  it('rate accepts boundary score 100', async () => {
    const config = createTestConfig()
    const actions = createErc8004ReputationActions(config)
    const result = await actions.rate(42n, 100)
    expect(result).toBe('0xfeedbackhash')
  })

  it('rate rejects score above 100', async () => {
    const config = createTestConfig()
    const actions = createErc8004ReputationActions(config)
    await expect(actions.rate(1n, 150)).rejects.toThrow(
      'rate() score must be 0–100',
    )
  })

  it('rate rejects negative score', async () => {
    const config = createTestConfig()
    const actions = createErc8004ReputationActions(config)
    await expect(actions.rate(1n, -1)).rejects.toThrow(
      'rate() score must be 0–100',
    )
  })

  it('rate throws without walletClient', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createErc8004ReputationActions(config)
    await expect(actions.rate(1n, 50)).rejects.toThrow(
      'walletClient is required',
    )
  })

  it('getSummary delegates to core with default tags', async () => {
    const { getSummary } = await import('@x402r/erc8004/reputation')
    const config = createTestConfig()
    const actions = createErc8004ReputationActions(config)
    const reviewers = [TEST_ADDR]

    const result = await actions.getSummary(42n, reviewers)

    expect(result.count).toBe(5n)
    expect(getSummary).toHaveBeenCalledWith(config.publicClient, {
      agentId: 42n,
      clientAddresses: reviewers,
      tag1: 'starred',
      tag2: 'x402',
      registryAddress: undefined,
    })
  })

  it('getSummary accepts custom tag overrides', async () => {
    const { getSummary } = await import('@x402r/erc8004/reputation')
    const config = createTestConfig()
    const actions = createErc8004ReputationActions(config)

    await actions.getSummary(42n, [TEST_ADDR], {
      tag1: 'custom1',
      tag2: 'custom2',
    })

    expect(getSummary).toHaveBeenCalledWith(
      config.publicClient,
      expect.objectContaining({ tag1: 'custom1', tag2: 'custom2' }),
    )
  })

  it('giveFeedback delegates raw params to core', async () => {
    const { giveFeedback } = await import('@x402r/erc8004/reputation')
    const config = createTestConfig()
    const actions = createErc8004ReputationActions(config)
    const params = {
      value: 85n,
      valueDecimals: 2,
      tag1: 'x402-delivered',
      tag2: 'proof-of-payment',
    }

    const result = await actions.giveFeedback(42n, params)

    expect(result).toBe('0xfeedbackhash')
    expect(giveFeedback).toHaveBeenCalledWith(config.walletClient, {
      agentId: 42n,
      ...params,
      registryAddress: undefined,
    })
  })

  it('giveFeedback throws without walletClient', async () => {
    const config = createTestConfig({ walletClient: undefined })
    const actions = createErc8004ReputationActions(config)
    await expect(
      actions.giveFeedback(1n, {
        value: 1n,
        valueDecimals: 0,
        tag1: 'a',
        tag2: 'b',
      }),
    ).rejects.toThrow('walletClient is required')
  })

  it('uses custom default tags from plugin options', async () => {
    const { giveFeedback } = await import('@x402r/erc8004/reputation')
    const config = createTestConfig()
    const actions = createErc8004ReputationActions(config, {
      defaultTag1: 'x402-delivered',
      defaultTag2: 'proof-of-payment',
    })

    await actions.rate(42n, 50)

    expect(giveFeedback).toHaveBeenCalledWith(
      config.walletClient,
      expect.objectContaining({
        tag1: 'x402-delivered',
        tag2: 'proof-of-payment',
      }),
    )
  })

  it('passes reputationRegistryAddress override', async () => {
    const { getSummary } = await import('@x402r/erc8004/reputation')
    const config = createTestConfig()
    const actions = createErc8004ReputationActions(config, {
      reputationRegistryAddress: TEST_ADDR,
    })

    await actions.getSummary(42n, [TEST_ADDR])

    expect(getSummary).toHaveBeenCalledWith(
      config.publicClient,
      expect.objectContaining({ registryAddress: TEST_ADDR }),
    )
  })
})

// ---------------------------------------------------------------------------
// Discovery actions
// ---------------------------------------------------------------------------

describe('createErc8004DiscoveryActions', () => {
  it('resolveServiceEndpoint delegates to core', async () => {
    const { resolveServiceEndpoint } = await import(
      '@x402r/erc8004/registration'
    )
    const config = createTestConfig()
    const actions = createErc8004DiscoveryActions(config)

    const result = await actions.resolveServiceEndpoint(7n, 'x402r.arbiter')

    expect(result.endpoint).toBe('https://arbiter.example.com')
    expect(resolveServiceEndpoint).toHaveBeenCalledWith(config.publicClient, {
      agentId: 7n,
      serviceName: 'x402r.arbiter',
      registryAddress: undefined,
    })
  })

  it('passes registryAddress override', async () => {
    const { resolveServiceEndpoint } = await import(
      '@x402r/erc8004/registration'
    )
    const config = createTestConfig()
    const actions = createErc8004DiscoveryActions(config, {
      registryAddress: TEST_ADDR,
    })

    await actions.resolveServiceEndpoint(7n, 'x402r.arbiter')

    expect(resolveServiceEndpoint).toHaveBeenCalledWith(
      config.publicClient,
      expect.objectContaining({ registryAddress: TEST_ADDR }),
    )
  })
})

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('default tag constants', () => {
  it('exports default feedback tags', () => {
    expect(DEFAULT_FEEDBACK_TAG1).toBe('starred')
    expect(DEFAULT_FEEDBACK_TAG2).toBe('x402')
  })
})
