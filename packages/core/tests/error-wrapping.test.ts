import {
  BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  encodeErrorResult,
} from 'viem'
import { describe, expect, it } from 'vitest'
import { wrapContractCall } from '../src/actions/_internal/error-wrapping.js'
import { ContractCallError } from '../src/errors/index.js'

const testAbi = [
  {
    type: 'error',
    name: 'ConditionNotMet',
    inputs: [{ name: 'reason', type: 'string' }],
  },
  {
    type: 'error',
    name: 'Unauthorized',
    inputs: [],
  },
  {
    type: 'function',
    name: 'release',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

function makeRevertError(
  errorName: string,
  args?: readonly unknown[],
): ContractFunctionExecutionError {
  const data = encodeErrorResult({
    abi: testAbi,
    errorName: errorName as any,
    args: args as any,
  })
  const revert = new ContractFunctionRevertedError({
    abi: testAbi,
    data,
    functionName: 'release',
  })
  return new ContractFunctionExecutionError(revert, {
    abi: testAbi,
    functionName: 'release',
    contractAddress: '0x1234567890123456789012345678901234567890',
  })
}

describe('wrapContractCall', () => {
  it('returns value on success', async () => {
    const result = await wrapContractCall('release', async () => 42n)
    expect(result).toBe(42n)
  })

  it('decoded revert → ContractCallError with revertName', async () => {
    const viemError = makeRevertError('Unauthorized')

    const thrown = await wrapContractCall('release', async () => {
      throw viemError
    }).catch((e: unknown) => e)

    expect(thrown).toBeInstanceOf(ContractCallError)
    const err = thrown as ContractCallError
    expect(err.revertName).toBe('Unauthorized')
    expect(err.shortMessage).toBe('release failed')
  })

  it('revert with args → args accessible on error', async () => {
    const viemError = makeRevertError('ConditionNotMet', ['escrow expired'])

    const thrown = await wrapContractCall('charge', async () => {
      throw viemError
    }).catch((e: unknown) => e)

    expect(thrown).toBeInstanceOf(ContractCallError)
    const err = thrown as ContractCallError
    expect(err.revertName).toBe('ConditionNotMet')
    expect(err.revertArgs).toEqual(['escrow expired'])
  })

  it('non-revert BaseError → ContractCallError with details', async () => {
    const viemError = new BaseError('could not estimate gas', {
      details: 'execution reverted',
    })

    const thrown = await wrapContractCall('refund', async () => {
      throw viemError
    }).catch((e: unknown) => e)

    expect(thrown).toBeInstanceOf(ContractCallError)
    const err = thrown as ContractCallError
    expect(err.revertName).toBeUndefined()
    expect(err.details).toBe('execution reverted')
  })

  it('non-revert execution error → contractAddress extracted', async () => {
    const inner = new BaseError('out of gas')
    const viemError = new ContractFunctionExecutionError(inner, {
      abi: testAbi,
      functionName: 'release',
      contractAddress: '0x1234567890123456789012345678901234567890',
    })

    const thrown = await wrapContractCall('release', async () => {
      throw viemError
    }).catch((e: unknown) => e)

    expect(thrown).toBeInstanceOf(ContractCallError)
    const err = thrown as ContractCallError
    expect(err.revertName).toBeUndefined()
    expect(err.message).toContain(
      'Contract: 0x1234567890123456789012345678901234567890',
    )
    expect(err.details).toBe('out of gas')
  })

  it('non-viem Error passes through unchanged', async () => {
    const plainError = new TypeError('bad arg')

    const thrown = await wrapContractCall('release', async () => {
      throw plainError
    }).catch((e: unknown) => e)

    expect(thrown).toBe(plainError)
    expect(thrown).toBeInstanceOf(TypeError)
  })

  it('original viem error preserved as cause', async () => {
    const viemError = makeRevertError('Unauthorized')

    const thrown = await wrapContractCall('release', async () => {
      throw viemError
    }).catch((e: unknown) => e)

    const err = thrown as ContractCallError
    expect(err.cause).toBeInstanceOf(ContractFunctionRevertedError)
  })
})
