import { describe, expect, it } from 'vitest'
import { createX402r } from '../src/client.js'
import {
  escrowPeriodActions,
  freezeActions,
  queryActions,
} from '../src/plugins/index.js'
import type { X402rConfig } from '../src/types.js'
import {
  TEST_ESCROW_PERIOD as escrowPeriodAddress,
  TEST_FREEZE as freezeAddress,
  TEST_OPERATOR as operatorAddress,
  publicClient,
  TEST_REFUND_REQUEST as refundRequestAddress,
  TEST_RECORDER,
  walletClient,
} from './fixtures.js'

const baseConfig: X402rConfig = {
  publicClient,
  walletClient,
  operatorAddress,
  refundRequestAddress,
  chainId: 84532,
}

describe('escrowPeriodActions plugin', () => {
  it('fills escrow slot via extend', () => {
    const client = createX402r(baseConfig)
    expect(client.escrow).toBeUndefined()

    const extended = client.extend(escrowPeriodActions(escrowPeriodAddress))
    expect(extended.escrow).toBeDefined()
    expect(extended.escrow!.isDuringEscrow).toBeTypeOf('function')
    expect(extended.escrow!.getAuthorizationTime).toBeTypeOf('function')
    expect(extended.escrow!.getDuration).toBeTypeOf('function')
  })

  it('does not override escrow when already configured', () => {
    const client = createX402r({ ...baseConfig, escrowPeriodAddress })
    expect(client.escrow).toBeDefined()

    const originalEscrow = client.escrow
    const extended = client.extend(escrowPeriodActions(escrowPeriodAddress))
    expect(extended.escrow).toBe(originalEscrow)
  })
})

describe('freezeActions plugin', () => {
  it('fills freeze slot via extend', () => {
    const client = createX402r(baseConfig)
    expect(client.freeze).toBeUndefined()

    const extended = client.extend(freezeActions(freezeAddress))
    expect(extended.freeze).toBeDefined()
    expect(extended.freeze!.freeze).toBeTypeOf('function')
    expect(extended.freeze!.unfreeze).toBeTypeOf('function')
    expect(extended.freeze!.isFrozen).toBeTypeOf('function')
  })

  it('does not override freeze when already configured', () => {
    const client = createX402r({ ...baseConfig, freezeAddress })
    expect(client.freeze).toBeDefined()

    const originalFreeze = client.freeze
    const extended = client.extend(freezeActions(freezeAddress))
    expect(extended.freeze).toBe(originalFreeze)
  })
})

describe('queryActions plugin', () => {
  it('fills query slot via extend', () => {
    const client = createX402r(baseConfig)
    expect(client.query).toBeUndefined()

    const extended = client.extend(queryActions(TEST_RECORDER))
    expect(extended.query).toBeDefined()
    expect(extended.query!.getPayerPayments).toBeTypeOf('function')
    expect(extended.query!.getReceiverPayments).toBeTypeOf('function')
    expect(extended.query!.getPayment).toBeTypeOf('function')
  })

  it('does not override query when already configured', () => {
    const client = createX402r({
      ...baseConfig,
      paymentIndexRecorderHookAddress: TEST_RECORDER,
    })
    expect(client.query).toBeDefined()

    const originalQuery = client.query
    const extended = client.extend(queryActions(TEST_RECORDER))
    expect(extended.query).toBe(originalQuery)
  })
})
