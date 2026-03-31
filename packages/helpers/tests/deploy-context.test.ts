import { ValidationError } from '@x402r/core'
import { describe, expect, it } from 'vitest'
import { parseDeployContext, toDeployContext } from '../src/deploy-context.js'

const VALID_CONTEXT = {
  operatorAddress: '0x1111111111111111111111111111111111111111',
  escrowPeriodAddress: '0x2222222222222222222222222222222222222222',
  arbiterConditionAddress: '0x3333333333333333333333333333333333333333',
} as const

describe('toDeployContext', () => {
  it('extracts only the three address fields', () => {
    const deployment = {
      ...VALID_CONTEXT,
      operatorConfig: { some: 'config' },
      deployments: [],
      summary: { newCount: 1, existingCount: 0, txHashes: [] },
    }
    const ctx = toDeployContext(deployment as any)
    expect(ctx).toEqual(VALID_CONTEXT)
    expect(Object.keys(ctx)).toEqual([
      'operatorAddress',
      'escrowPeriodAddress',
      'arbiterConditionAddress',
    ])
  })

  it('round-trips through JSON', () => {
    const ctx = toDeployContext(VALID_CONTEXT)
    const json = JSON.stringify(ctx)
    const parsed = parseDeployContext(JSON.parse(json))
    expect(parsed).toEqual(VALID_CONTEXT)
  })
})

describe('parseDeployContext', () => {
  it('parses a valid context', () => {
    const ctx = parseDeployContext(VALID_CONTEXT)
    expect(ctx.operatorAddress).toBe(VALID_CONTEXT.operatorAddress)
  })

  it('throws on null', () => {
    expect(() => parseDeployContext(null)).toThrow(ValidationError)
  })

  it('throws on missing fields', () => {
    expect(() => parseDeployContext({ operatorAddress: '0x1' })).toThrow(
      /missing required address fields/,
    )
  })
})
