import { describe, expect, it } from 'vitest'
import {
  ConfigError,
  ContractCallError,
  NotImplementedError,
  ValidationError,
  X402rError,
} from '../src/errors/index.js'

describe('X402rError message composition', () => {
  it('composes message from shortMessage only', () => {
    const err = new X402rError('something went wrong')
    expect(err.shortMessage).toBe('something went wrong')
    expect(err.message).toContain('something went wrong')
    expect(err.message).toContain('Version: @x402r/core@')
  })

  it('composes message from all args', () => {
    const err = new X402rError('tx reverted', {
      details: 'ConditionNotMet',
      metaMessages: ['Check condition config', 'Ensure caller is authorized'],
      docsPath: '/sdk/conditions',
    })
    expect(err.message).toContain('tx reverted')
    expect(err.message).toContain('Check condition config')
    expect(err.message).toContain('Ensure caller is authorized')
    expect(err.message).toContain('Docs: https://docs.x402r.org/sdk/conditions')
    expect(err.message).toContain('Details: ConditionNotMet')
  })
})

describe('X402rError.walk()', () => {
  it('returns self when no cause', () => {
    const err = new X402rError('root')
    expect(err.walk()).toBe(err)
  })

  it('returns deepest cause in chain', () => {
    const root = new Error('root cause')
    const mid = new X402rError('middle', { cause: root })
    const top = new X402rError('top', { cause: mid })
    expect(top.walk()).toBe(root)
  })

  it('returns first cause matching predicate', () => {
    const viemError = new Error('ContractFunctionRevertedError')
    viemError.name = 'ContractFunctionRevertedError'
    const wrapped = new X402rError('call failed', { cause: viemError })

    const found = wrapped.walk(
      (err) => err.name === 'ContractFunctionRevertedError',
    )
    expect(found).toBe(viemError)
  })

  it('returns null when predicate never matches', () => {
    const err = new X402rError('no match')
    expect(err.walk((e) => e.name === 'NonExistent')).toBeNull()
  })
})

describe('ContractCallError', () => {
  it('formats operation name into shortMessage', () => {
    const err = new ContractCallError('release')
    expect(err.shortMessage).toBe('release failed')
  })

  it('includes contractAddress in message', () => {
    const err = new ContractCallError('charge', {
      contractAddress: '0x1234',
      cause: new Error('revert'),
    })
    expect(err.message).toContain('Contract: 0x1234')
  })
})

describe('NotImplementedError', () => {
  it('formats method name into shortMessage', () => {
    const err = new NotImplementedError('watchPayments')
    expect(err.shortMessage).toBe('watchPayments is not implemented')
    expect(err.message).toContain('Docs: https://docs.x402r.org/sdk/roadmap')
  })
})

describe('subclass docsPath defaults', () => {
  it('ConfigError defaults to /sdk/config', () => {
    expect(new ConfigError('bad').message).toContain('/sdk/config')
  })

  it('ValidationError defaults to /sdk/validation', () => {
    expect(new ValidationError('bad').message).toContain('/sdk/validation')
  })

  it('docsPath can be overridden', () => {
    const err = new ConfigError('bad', { docsPath: '/sdk/custom' })
    expect(err.message).toContain('/sdk/custom')
    expect(err.message).not.toContain('/sdk/config')
  })
})
