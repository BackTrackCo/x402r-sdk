import { paymentOperatorAbi } from '@x402r/core'
import { describe, expect, it, vi } from 'vitest'
import { createWatchActions } from '../../src/actions/watch.js'
import { createTestConfig } from '../fixtures.js'

describe('createWatchActions', () => {
  it('onPayment calls watchContractEvent with correct ABI and operatorAddress', () => {
    const unwatchFn = vi.fn()
    const mockWatchContractEvent = vi.fn().mockReturnValue(unwatchFn)
    const config = createTestConfig()
    ;(config as any).publicClient = {
      ...config.publicClient,
      watchContractEvent: mockWatchContractEvent,
    }

    const actions = createWatchActions(config)
    actions.onPayment(() => {})

    expect(mockWatchContractEvent).toHaveBeenCalledTimes(3)
    expect(mockWatchContractEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        address: config.operatorAddress,
        abi: paymentOperatorAbi,
        eventName: 'AuthorizationCreated',
      }),
    )
    expect(mockWatchContractEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'ChargeExecuted',
      }),
    )
    expect(mockWatchContractEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'ReleaseExecuted',
      }),
    )
  })

  it('returned unwatch function calls all individual unwatchers', () => {
    const unwatchFns = [vi.fn(), vi.fn(), vi.fn()]
    let callIdx = 0
    const mockWatchContractEvent = vi.fn().mockImplementation(() => {
      return unwatchFns[callIdx++]
    })
    const config = createTestConfig()
    ;(config as any).publicClient = {
      ...config.publicClient,
      watchContractEvent: mockWatchContractEvent,
    }

    const actions = createWatchActions(config)
    const unwatch = actions.onPayment(() => {})

    expect(unwatchFns[0]).not.toHaveBeenCalled()
    expect(unwatchFns[1]).not.toHaveBeenCalled()
    expect(unwatchFns[2]).not.toHaveBeenCalled()

    unwatch()

    expect(unwatchFns[0]).toHaveBeenCalledOnce()
    expect(unwatchFns[1]).toHaveBeenCalledOnce()
    expect(unwatchFns[2]).toHaveBeenCalledOnce()
  })
})
