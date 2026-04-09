import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FEEDBACK_TAG1,
  DEFAULT_FEEDBACK_TAG2,
} from '../../src/actions/erc8004.js'
import { createX402r } from '../../src/client.js'
import { erc8004Actions } from '../../src/plugins/index.js'
import type { X402rConfig } from '../../src/types.js'
import {
  TEST_OPERATOR as operatorAddress,
  publicClient,
  TEST_REFUND_REQUEST as refundRequestAddress,
  walletClient,
} from '../fixtures.js'

const baseConfig: X402rConfig = {
  publicClient,
  walletClient,
  operatorAddress,
  refundRequestAddress,
  chainId: 84532,
}

describe('erc8004Actions plugin', () => {
  it('attaches identity, reputation, and discovery namespaces via extend', () => {
    const client = createX402r(baseConfig)
    const extended = client.extend(erc8004Actions())

    expect(extended.identity).toBeDefined()
    expect(extended.reputation).toBeDefined()
    expect(extended.discovery).toBeDefined()
  })

  it('identity namespace has all expected functions', () => {
    const extended = createX402r(baseConfig).extend(erc8004Actions())

    expect(extended.identity.register).toBeTypeOf('function')
    expect(extended.identity.verifyAgentId).toBeTypeOf('function')
    expect(extended.identity.resolveAgent).toBeTypeOf('function')
    expect(extended.identity.isRegistered).toBeTypeOf('function')
  })

  it('reputation namespace has all expected functions', () => {
    const extended = createX402r(baseConfig).extend(erc8004Actions())

    expect(extended.reputation.rate).toBeTypeOf('function')
    expect(extended.reputation.getSummary).toBeTypeOf('function')
    expect(extended.reputation.giveFeedback).toBeTypeOf('function')
  })

  it('discovery namespace has all expected functions', () => {
    const extended = createX402r(baseConfig).extend(erc8004Actions())

    expect(extended.discovery.resolveServiceEndpoint).toBeTypeOf('function')
  })

  it('is chainable with other plugins', () => {
    const extended = createX402r(baseConfig)
      .extend(erc8004Actions())
      .extend(() => ({ custom: { hello: () => 'world' } }))

    expect(extended.identity).toBeDefined()
    expect(extended.reputation).toBeDefined()
    expect(extended.discovery).toBeDefined()
    expect(extended.custom.hello()).toBe('world')
  })

  it('does not override base client keys', () => {
    const client = createX402r(baseConfig)
    const extended = client.extend(erc8004Actions())

    expect(extended.payment.authorize).toBeTypeOf('function')
    expect(extended.operator.getConfig).toBeTypeOf('function')
    expect(extended.config.chainId).toBe(84532)
  })

  it('accepts custom registry address overrides', () => {
    const customAddress = '0x1111111111111111111111111111111111111111' as const
    const extended = createX402r(baseConfig).extend(
      erc8004Actions({
        registryAddress: customAddress,
        reputationRegistryAddress: customAddress,
      }),
    )

    expect(extended.identity).toBeDefined()
    expect(extended.reputation).toBeDefined()
  })

  it('accepts custom default tags', () => {
    const extended = createX402r(baseConfig).extend(
      erc8004Actions({
        defaultTag1: 'x402-delivered',
        defaultTag2: 'proof-of-payment',
      }),
    )

    expect(extended.reputation.rate).toBeTypeOf('function')
    expect(extended.reputation.getSummary).toBeTypeOf('function')
  })
})

describe('rate() score validation', () => {
  it('rejects score above 100', async () => {
    const extended = createX402r(baseConfig).extend(erc8004Actions())
    await expect(extended.reputation.rate(1n, 150)).rejects.toThrow(
      'rate() score must be 0–100',
    )
  })

  it('rejects negative score', async () => {
    const extended = createX402r(baseConfig).extend(erc8004Actions())
    await expect(extended.reputation.rate(1n, -1)).rejects.toThrow(
      'rate() score must be 0–100',
    )
  })
})

describe('default tag constants', () => {
  it('exports default feedback tags', () => {
    expect(DEFAULT_FEEDBACK_TAG1).toBe('starred')
    expect(DEFAULT_FEEDBACK_TAG2).toBe('x402')
  })
})
