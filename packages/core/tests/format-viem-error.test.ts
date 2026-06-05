import { describe, expect, it } from 'vitest'
import { X402rError } from '../src/errors/base.js'
import { formatViemError } from '../src/errors/format.js'

describe('formatViemError', () => {
  it('returns .message for an X402rError instance', () => {
    const err = new X402rError('capture failed', { details: 'ConditionNotMet' })
    expect(formatViemError(err)).toBe(err.message)
  })

  it('returns shortMessage for a viem-shaped object', () => {
    const viemLike = { shortMessage: 'The contract function reverted.' }
    expect(formatViemError(viemLike)).toBe('The contract function reverted.')
  })

  it('returns .message for a plain Error', () => {
    const err = new Error('something went wrong')
    expect(formatViemError(err)).toBe('something went wrong')
  })

  it('returns the string itself for a string value', () => {
    expect(formatViemError('raw string error')).toBe('raw string error')
  })

  it('falls through to String(err) for a plain object without shortMessage', () => {
    const obj = { code: 42 }
    expect(formatViemError(obj)).toBe(String(obj))
  })

  it('handles null', () => {
    expect(formatViemError(null)).toBe('null')
  })

  it('handles undefined', () => {
    expect(formatViemError(undefined)).toBe('undefined')
  })
})
