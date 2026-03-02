import {
  BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  encodeErrorResult,
  parseAbiItem,
} from 'viem'
import { describe, expect, it } from 'vitest'
import { ContractCallError } from '../src/errors/index.js'
import { wrapContractCall } from '../src/operations/error-wrapping.js'

// ---------------------------------------------------------------------------
// Helpers — build real viem errors the same way viem does internally
// ---------------------------------------------------------------------------

const MOCK_ADDRESS = '0x1111111111111111111111111111111111111111' as const

const conditionNotMetAbi = [
  parseAbiItem('error ConditionNotMet(uint256 reason)'),
] as const

const errorStringAbi = [parseAbiItem('error Error(string)')] as const

function makeRevertError(
  opts: ConstructorParameters<typeof ContractFunctionRevertedError>[0],
) {
  return new ContractFunctionRevertedError(opts)
}

function makeExecutionError(
  cause: ContractFunctionRevertedError,
  contractAddress?: `0x${string}`,
) {
  return new ContractFunctionExecutionError(cause, {
    abi: [],
    functionName: 'test',
    contractAddress,
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('wrapContractCall', () => {
  it('returns value on success', async () => {
    const result = await wrapContractCall('myOp', () => Promise.resolve('ok'))
    expect(result).toBe('ok')
  })

  it('wraps viem BaseError → ContractCallError', async () => {
    const baseErr = new BaseError('something went wrong')

    await expect(
      wrapContractCall('myOp', () => Promise.reject(baseErr)),
    ).rejects.toThrow(ContractCallError)

    try {
      await wrapContractCall('myOp', () => Promise.reject(baseErr))
    } catch (err) {
      expect(err).toBeInstanceOf(ContractCallError)
      expect((err as ContractCallError).message).toContain('myOp failed')
      expect((err as ContractCallError).details).toBe(baseErr.shortMessage)
    }
  })

  it('decoded custom error → details has errorName', async () => {
    const encoded = encodeErrorResult({
      abi: conditionNotMetAbi,
      errorName: 'ConditionNotMet',
      args: [42n],
    })
    const revert = makeRevertError({
      abi: conditionNotMetAbi,
      data: encoded,
      functionName: 'test',
    })
    const exec = makeExecutionError(revert)

    try {
      await wrapContractCall('authorize', () => Promise.reject(exec))
    } catch (err) {
      expect(err).toBeInstanceOf(ContractCallError)
      expect((err as ContractCallError).details).toBe('ConditionNotMet')
    }
  })

  it('decoded error args → metaMessages', async () => {
    const encoded = encodeErrorResult({
      abi: conditionNotMetAbi,
      errorName: 'ConditionNotMet',
      args: [42n],
    })
    const revert = makeRevertError({
      abi: conditionNotMetAbi,
      data: encoded,
      functionName: 'test',
    })
    const exec = makeExecutionError(revert)

    try {
      await wrapContractCall('authorize', () => Promise.reject(exec))
    } catch (err) {
      const meta = (err as ContractCallError).metaMessages
      expect(meta).toBeDefined()
      expect(meta!.some((m) => m.startsWith('Args:'))).toBe(true)
      expect(meta!.some((m) => m.includes('42'))).toBe(true)
    }
  })

  it('Error(string) reason → details', async () => {
    const encoded = encodeErrorResult({
      abi: errorStringAbi,
      errorName: 'Error',
      args: ['Sale must be active'],
    })
    const revert = makeRevertError({
      abi: errorStringAbi,
      data: encoded,
      functionName: 'test',
    })
    const exec = makeExecutionError(revert)

    try {
      await wrapContractCall('purchase', () => Promise.reject(exec))
    } catch (err) {
      expect((err as ContractCallError).details).toBe('Sale must be active')
    }
  })

  it('unknown selector → Selector in metaMessages', async () => {
    // Data with an unknown 4-byte selector not in the provided ABI
    const unknownData =
      '0xdeadbeef000000000000000000000000000000000000000000000000000000000000002a' as `0x${string}`
    const revert = makeRevertError({
      abi: [],
      data: unknownData,
      functionName: 'test',
    })
    const exec = makeExecutionError(revert)

    try {
      await wrapContractCall('call', () => Promise.reject(exec))
    } catch (err) {
      const meta = (err as ContractCallError).metaMessages
      expect(meta).toBeDefined()
      expect(meta!.some((m) => m.includes('Selector: 0xdeadbeef'))).toBe(true)
    }
  })

  it('non-viem TypeError passes through unchanged', async () => {
    const typeErr = new TypeError('cannot read property')

    await expect(
      wrapContractCall('op', () => Promise.reject(typeErr)),
    ).rejects.toThrow(typeErr)

    await expect(
      wrapContractCall('op', () => Promise.reject(typeErr)),
    ).rejects.not.toBeInstanceOf(ContractCallError)
  })

  it('preserves original viem error as cause', async () => {
    const encoded = encodeErrorResult({
      abi: conditionNotMetAbi,
      errorName: 'ConditionNotMet',
      args: [1n],
    })
    const revert = makeRevertError({
      abi: conditionNotMetAbi,
      data: encoded,
      functionName: 'test',
    })
    const exec = makeExecutionError(revert)

    try {
      await wrapContractCall('op', () => Promise.reject(exec))
    } catch (err) {
      const sdkErr = err as ContractCallError
      // walk() should find the original revert error in the cause chain
      const found = sdkErr.walk(
        (e) => e instanceof ContractFunctionRevertedError,
      )
      expect(found).toBeInstanceOf(ContractFunctionRevertedError)
    }
  })

  it('extracts contractAddress from execution error', async () => {
    const revert = makeRevertError({
      abi: [],
      functionName: 'test',
    })
    const exec = makeExecutionError(revert, MOCK_ADDRESS)

    try {
      await wrapContractCall('charge', () => Promise.reject(exec))
    } catch (err) {
      const sdkErr = err as ContractCallError
      // contractAddress should appear in the error message via metaMessages
      expect(sdkErr.message).toContain(MOCK_ADDRESS)
    }
  })

  it('works without contractAddress in chain', async () => {
    const revert = makeRevertError({
      abi: [],
      functionName: 'test',
    })
    // No contractAddress passed to execution error
    const exec = makeExecutionError(revert)

    try {
      await wrapContractCall('release', () => Promise.reject(exec))
    } catch (err) {
      const sdkErr = err as ContractCallError
      expect(sdkErr.message).not.toContain('Contract:')
    }
  })
})
