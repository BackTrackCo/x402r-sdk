import { describe, expect, it } from 'vitest'
import { X402rError } from '../src/errors/base.js'
import { formatError } from '../src/errors/format.js'

describe('formatError', () => {
  it('returns .message for an X402rError instance', () => {
    const err = new X402rError('capture failed', { details: 'ConditionNotMet' })
    expect(formatError(err)).toBe(err.message)
  })

  it('returns shortMessage for a viem-shaped object', () => {
    const viemLike = { shortMessage: 'The contract function reverted.' }
    expect(formatError(viemLike)).toBe('The contract function reverted.')
  })

  it('prefers shortMessage over .message for an Error that carries both (viem BaseError shape)', () => {
    const err = Object.assign(new Error('long verbose message'), {
      shortMessage: 'short',
    })
    expect(formatError(err)).toBe('short')
  })

  it('returns .message for a plain Error', () => {
    const err = new Error('something went wrong')
    expect(formatError(err)).toBe('something went wrong')
  })

  it('returns the string itself for a string value', () => {
    expect(formatError('raw string error')).toBe('raw string error')
  })

  it('falls through to String(err) for a plain object without shortMessage', () => {
    const obj = { code: 42 }
    expect(formatError(obj)).toBe(String(obj))
  })

  it('handles null', () => {
    expect(formatError(null)).toBe('null')
  })

  it('handles undefined', () => {
    expect(formatError(undefined)).toBe('undefined')
  })
})
