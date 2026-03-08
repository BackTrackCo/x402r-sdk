import { getChainConfig } from '@x402r/core'
import { createPublicClient, http } from 'viem'
import { describe, expect, it } from 'vitest'
import { createX402r, resolveConfig } from '../src/client.js'
import type { X402rConfig } from '../src/types.js'
import {
  TEST_ESCROW_PERIOD as escrowPeriodAddress,
  TEST_FREEZE as freezeAddress,
  TEST_OPERATOR as operatorAddress,
  publicClient,
  walletClient,
} from './fixtures.js'

const baseSepoliaConfig = getChainConfig(84532)

const baseConfig: X402rConfig = {
  publicClient,
  walletClient,
  operatorAddress,
  chainId: 84532,
}

// ---------------------------------------------------------------------------
// resolveConfig
// ---------------------------------------------------------------------------

describe('resolveConfig', () => {
  it('resolves addresses from chain config for Base Sepolia', () => {
    const resolved = resolveConfig(baseConfig)
    expect(resolved.chainId).toBe(84532)
    expect(resolved.operatorAddress).toBe(operatorAddress)
    expect(resolved.refundRequestAddress).toBe(baseSepoliaConfig.refundRequest)
    expect(resolved.refundRequestEvidenceAddress).toBe(
      baseSepoliaConfig.refundRequestEvidence,
    )
    expect(resolved.escrowPeriodAddress).toBeUndefined()
    expect(resolved.freezeAddress).toBeUndefined()
  })

  it('resolves chainId from CAIP-2 network string', () => {
    const resolved = resolveConfig({
      ...baseConfig,
      chainId: undefined,
      network: 'eip155:84532',
    })
    expect(resolved.chainId).toBe(84532)
  })

  it('resolves chainId from publicClient.chain', () => {
    const resolved = resolveConfig({
      publicClient,
      walletClient,
      operatorAddress,
    })
    expect(resolved.chainId).toBe(84532)
  })

  it('throws for unsupported chain', () => {
    expect(() => resolveConfig({ ...baseConfig, chainId: 999999 })).toThrow()
  })

  it('user address overrides win over chain config', () => {
    const customRefundAddress =
      '0x1111111111111111111111111111111111111111' as const
    const resolved = resolveConfig({
      ...baseConfig,
      refundRequestAddress: customRefundAddress,
    })
    expect(resolved.refundRequestAddress).toBe(customRefundAddress)
    // Non-overridden address still comes from chain config
    expect(resolved.refundRequestEvidenceAddress).toBe(
      baseSepoliaConfig.refundRequestEvidence,
    )
  })

  it('passes through optional plugin addresses', () => {
    const resolved = resolveConfig({
      ...baseConfig,
      escrowPeriodAddress,
      freezeAddress,
    })
    expect(resolved.escrowPeriodAddress).toBe(escrowPeriodAddress)
    expect(resolved.freezeAddress).toBe(freezeAddress)
  })

  it('throws when no chainId source is available', () => {
    const noChainClient = createPublicClient({
      transport: http('http://localhost:8545'),
    })
    expect(() =>
      resolveConfig({
        publicClient: noChainClient,
        operatorAddress,
      }),
    ).toThrow('Unable to determine chain')
  })
})

// ---------------------------------------------------------------------------
// createX402r — shape
// ---------------------------------------------------------------------------

describe('createX402r', () => {
  it('returns client with all expected keys', () => {
    const client = createX402r(baseConfig)
    expect(client.config).toBeDefined()
    expect(client.payment).toBeDefined()
    expect(client.refund).toBeDefined()
    expect(client.evidence).toBeDefined()
    expect(client.operator).toBeDefined()
    expect(client.watch).toBeDefined()
    expect(client.canExecute).toBeTypeOf('function')
    expect(client.extend).toBeTypeOf('function')
  })

  it('escrow is undefined when no escrowPeriodAddress', () => {
    const client = createX402r(baseConfig)
    expect(client.escrow).toBeUndefined()
  })

  it('escrow is defined when escrowPeriodAddress provided', () => {
    const client = createX402r({ ...baseConfig, escrowPeriodAddress })
    expect(client.escrow).toBeDefined()
    expect(client.escrow!.isDuringEscrow).toBeTypeOf('function')
    expect(client.escrow!.getAuthorizationTime).toBeTypeOf('function')
    expect(client.escrow!.getDuration).toBeTypeOf('function')
  })

  it('freeze is undefined when no freezeAddress', () => {
    const client = createX402r(baseConfig)
    expect(client.freeze).toBeUndefined()
  })

  it('freeze is defined when freezeAddress provided', () => {
    const client = createX402r({ ...baseConfig, freezeAddress })
    expect(client.freeze).toBeDefined()
    expect(client.freeze!.freeze).toBeTypeOf('function')
    expect(client.freeze!.unfreeze).toBeTypeOf('function')
    expect(client.freeze!.isFrozen).toBeTypeOf('function')
  })
})

// ---------------------------------------------------------------------------
// .extend()
// ---------------------------------------------------------------------------

describe('extend', () => {
  it('adds new namespace to client', () => {
    const client = createX402r(baseConfig)
    const extended = client.extend(() => ({
      custom: { hello: () => 'world' },
    }))
    expect((extended as any).custom.hello()).toBe('world')
  })

  it('cannot override base keys', () => {
    const client = createX402r(baseConfig)
    const extended = client.extend(() => ({
      payment: { fake: true },
    }))
    // Base payment should be preserved
    expect(extended.payment.authorize).toBeTypeOf('function')
    expect((extended.payment as any).fake).toBeUndefined()
  })

  it('is chainable', () => {
    const client = createX402r(baseConfig)
    const extended = client
      .extend(() => ({ foo: { a: 1 } }))
      .extend(() => ({ bar: { b: 2 } }))
    expect((extended as any).foo.a).toBe(1)
    expect((extended as any).bar.b).toBe(2)
  })

  it('receives client in extension function', () => {
    const client = createX402r(baseConfig)
    const extended = client.extend((c) => ({
      meta: { chainId: c.config.chainId },
    }))
    expect((extended as any).meta.chainId).toBe(84532)
  })
})
