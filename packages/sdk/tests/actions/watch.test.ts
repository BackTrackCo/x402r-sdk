import { paymentOperatorAbi, signatureRefundRequestAbi } from '@x402r/core'
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

  it('onRefundRequest calls watchContractEvent with signatureRefundRequestAbi and refundRequestAddress', () => {
    const unwatchFn = vi.fn()
    const mockWatchContractEvent = vi.fn().mockReturnValue(unwatchFn)
    const config = createTestConfig()
    ;(config as any).publicClient = {
      ...config.publicClient,
      watchContractEvent: mockWatchContractEvent,
    }

    const actions = createWatchActions(config)
    const unwatch = actions.onRefundRequest(() => {})

    expect(mockWatchContractEvent).toHaveBeenCalledTimes(1)
    expect(mockWatchContractEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        address: config.refundRequestAddress,
        abi: signatureRefundRequestAbi,
      }),
    )

    unwatch()
    expect(unwatchFn).toHaveBeenCalledOnce()
  })

  it('onPayment forwards each log to callback individually', () => {
    const capturedOnLogs: Array<(logs: unknown[]) => void> = []
    const mockWatchContractEvent = vi.fn().mockImplementation((args) => {
      capturedOnLogs.push(args.onLogs)
      return vi.fn()
    })
    const config = createTestConfig()
    ;(config as any).publicClient = {
      ...config.publicClient,
      watchContractEvent: mockWatchContractEvent,
    }

    const actions = createWatchActions(config)
    const received: unknown[] = []
    actions.onPayment((log) => received.push(log))

    expect(capturedOnLogs).toHaveLength(3)
    capturedOnLogs[0]([{ event: 'AuthorizationCreated' }])
    capturedOnLogs[1]([{ event: 'ChargeExecuted' }])
    capturedOnLogs[2]([{ event: 'ReleaseExecuted' }])

    expect(received).toEqual([
      { event: 'AuthorizationCreated' },
      { event: 'ChargeExecuted' },
      { event: 'ReleaseExecuted' },
    ])
  })

  it('onRefundRequest returns callable unwatch when refundRequestAddress is undefined', () => {
    const mockWatchContractEvent = vi.fn()
    const config = createTestConfig({ refundRequestAddress: undefined })
    ;(config as any).publicClient = {
      ...config.publicClient,
      watchContractEvent: mockWatchContractEvent,
    }

    const actions = createWatchActions(config)
    const unwatch = actions.onRefundRequest(() => {})

    expect(mockWatchContractEvent).not.toHaveBeenCalled()
    expect(unwatch).toBeTypeOf('function')
    unwatch() // should not throw
  })

  it('onRefundRequest forwards logs to callback', () => {
    let capturedOnLogs: (logs: unknown[]) => void
    const unwatchFn = vi.fn()
    const mockWatchContractEvent = vi.fn().mockImplementation((args) => {
      capturedOnLogs = args.onLogs
      return unwatchFn
    })
    const config = createTestConfig()
    ;(config as any).publicClient = {
      ...config.publicClient,
      watchContractEvent: mockWatchContractEvent,
    }

    const actions = createWatchActions(config)
    const received: unknown[] = []
    actions.onRefundRequest((log) => received.push(log))

    capturedOnLogs!([
      { event: 'RefundRequested', id: 1 },
      { event: 'RefundRequested', id: 2 },
    ])

    expect(received).toEqual([
      { event: 'RefundRequested', id: 1 },
      { event: 'RefundRequested', id: 2 },
    ])
  })

  it('onRefundExecuted calls watchContractEvent with both refund event names', () => {
    const unwatchFn = vi.fn()
    const mockWatchContractEvent = vi.fn().mockReturnValue(unwatchFn)
    const config = createTestConfig()
    ;(config as any).publicClient = {
      ...config.publicClient,
      watchContractEvent: mockWatchContractEvent,
    }

    const actions = createWatchActions(config)
    actions.onRefundExecuted(() => {})

    expect(mockWatchContractEvent).toHaveBeenCalledTimes(2)
    expect(mockWatchContractEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        address: config.operatorAddress,
        abi: paymentOperatorAbi,
        eventName: 'RefundInEscrowExecuted',
      }),
    )
    expect(mockWatchContractEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        address: config.operatorAddress,
        abi: paymentOperatorAbi,
        eventName: 'RefundPostEscrowExecuted',
      }),
    )
  })

  it('onRefundExecuted forwards each log to callback individually', () => {
    const capturedOnLogs: Array<(logs: unknown[]) => void> = []
    const mockWatchContractEvent = vi.fn().mockImplementation((args) => {
      capturedOnLogs.push(args.onLogs)
      return vi.fn()
    })
    const config = createTestConfig()
    ;(config as any).publicClient = {
      ...config.publicClient,
      watchContractEvent: mockWatchContractEvent,
    }

    const actions = createWatchActions(config)
    const received: unknown[] = []
    actions.onRefundExecuted((log) => received.push(log))

    expect(capturedOnLogs).toHaveLength(2)
    capturedOnLogs[0]([{ event: 'RefundInEscrowExecuted' }])
    capturedOnLogs[1]([{ event: 'RefundPostEscrowExecuted' }])

    expect(received).toEqual([
      { event: 'RefundInEscrowExecuted' },
      { event: 'RefundPostEscrowExecuted' },
    ])
  })

  it('onRefundExecuted combined unwatch calls both individual unwatchers', () => {
    const unwatchFns = [vi.fn(), vi.fn()]
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
    const unwatch = actions.onRefundExecuted(() => {})

    expect(unwatchFns[0]).not.toHaveBeenCalled()
    expect(unwatchFns[1]).not.toHaveBeenCalled()

    unwatch()

    expect(unwatchFns[0]).toHaveBeenCalledOnce()
    expect(unwatchFns[1]).toHaveBeenCalledOnce()
  })

  it('onFeeDistribution watches FeesDistributed and forwards logs', () => {
    let capturedOnLogs: (logs: unknown[]) => void
    const unwatchFn = vi.fn()
    const mockWatchContractEvent = vi.fn().mockImplementation((args) => {
      capturedOnLogs = args.onLogs
      return unwatchFn
    })
    const config = createTestConfig()
    ;(config as any).publicClient = {
      ...config.publicClient,
      watchContractEvent: mockWatchContractEvent,
    }

    const actions = createWatchActions(config)
    const received: unknown[] = []
    const unwatch = actions.onFeeDistribution((log) => received.push(log))

    expect(mockWatchContractEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        address: config.operatorAddress,
        abi: paymentOperatorAbi,
        eventName: 'FeesDistributed',
      }),
    )

    capturedOnLogs!([{ amount: 100n }])
    expect(received).toEqual([{ amount: 100n }])

    unwatch()
    expect(unwatchFn).toHaveBeenCalledOnce()
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
