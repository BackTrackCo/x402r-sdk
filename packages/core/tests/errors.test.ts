import { describe, expect, it } from 'vitest'
import {
  X402rError,
  ConfigError,
  ContractCallError,
  NotImplementedError,
  ValidationError,
} from '../src/errors/index.js'

describe('X402rError', () => {
  it('constructs with shortMessage only', () => {
    const err = new X402rError('something went wrong')
    expect(err.shortMessage).toBe('something went wrong')
    expect(err.message).toContain('something went wrong')
    expect(err.message).toContain('Version: @x402r/core@')
    expect(err.details).toBeUndefined()
    expect(err.metaMessages).toBeUndefined()
    expect(err.docsPath).toBeUndefined()
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

  it('walk() returns self when no cause', () => {
    const err = new X402rError('root')
    expect(err.walk()).toBe(err)
  })

  it('walk() returns deepest cause', () => {
    const root = new Error('root cause')
    const mid = new X402rError('middle', { cause: root })
    const top = new X402rError('top', { cause: mid })
    expect(top.walk()).toBe(root)
  })

  it('walk(fn) returns first cause matching predicate', () => {
    const viemError = new Error('ContractFunctionRevertedError')
    viemError.name = 'ContractFunctionRevertedError'
    const wrapped = new X402rError('call failed', { cause: viemError })

    const found = wrapped.walk(
      (err) => err.name === 'ContractFunctionRevertedError',
    )
    expect(found).toBe(viemError)
  })

  it('walk(fn) returns null when no match', () => {
    const err = new X402rError('no match')
    const found = err.walk((e) => e.name === 'NonExistent')
    expect(found).toBeNull()
  })
})

describe('subclass instanceof', () => {
  it('ConfigError is instance of X402rError', () => {
    const err = new ConfigError('network not found')
    expect(err).toBeInstanceOf(X402rError)
    expect(err).toBeInstanceOf(ConfigError)
    expect(err.name).toBe('ConfigError')
  })

  it('ValidationError is instance of X402rError', () => {
    const err = new ValidationError('amount is zero')
    expect(err).toBeInstanceOf(X402rError)
    expect(err).toBeInstanceOf(ValidationError)
    expect(err.name).toBe('ValidationError')
  })

  it('cross-class instanceof is false', () => {
    const configErr = new ConfigError('cfg')
    expect(configErr).not.toBeInstanceOf(ValidationError)
    expect(configErr).not.toBeInstanceOf(ContractCallError)
  })
})

describe('ContractCallError', () => {
  it('includes operation name in shortMessage', () => {
    const err = new ContractCallError('release')
    expect(err.shortMessage).toBe('release failed')
  })

  it('includes contractAddress in metaMessages', () => {
    const err = new ContractCallError('charge', {
      contractAddress: '0x1234',
      cause: new Error('revert'),
    })
    expect(err.metaMessages).toContain('Contract: 0x1234')
    expect(err.message).toContain('Contract: 0x1234')
    expect(err.walk()).toBeInstanceOf(Error)
  })
})

describe('NotImplementedError', () => {
  it('includes method name in message', () => {
    const err = new NotImplementedError('watchPayments')
    expect(err.shortMessage).toBe('watchPayments is not implemented')
    expect(err.message).toContain('Docs: https://docs.x402r.org/sdk/roadmap')
    expect(err).toBeInstanceOf(X402rError)
  })
})

describe('default docsPath', () => {
  it('ConfigError defaults to /sdk/config', () => {
    const err = new ConfigError('bad')
    expect(err.message).toContain('/sdk/config')
  })

  it('ValidationError defaults to /sdk/validation', () => {
    const err = new ValidationError('bad')
    expect(err.message).toContain('/sdk/validation')
  })

  it('docsPath can be overridden', () => {
    const err = new ConfigError('bad', { docsPath: '/sdk/custom' })
    expect(err.message).toContain('/sdk/custom')
    expect(err.message).not.toContain('/sdk/config')
  })
})
