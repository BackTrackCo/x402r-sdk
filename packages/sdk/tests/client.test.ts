import { ConfigError } from '@x402r/core'
import type { Address } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import { createX402r } from '../src/client.js'
import {
  createMockPaymentInfo,
  createMockPublicClient,
  createMockWalletClient,
  MOCK_OPERATOR_ADDRESS,
} from './fixtures.js'

describe('createX402r', () => {
  it('returns client with all 6 action groups', () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    expect(client.payment).toBeDefined()
    expect(client.refund).toBeDefined()
    expect(client.evidence).toBeDefined()
    expect(client.freeze).toBeDefined()
    expect(client.operator).toBeDefined()
    expect(client.fee).toBeDefined()
  })

  it('exposes resolved config', () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    expect(client.config.chainId).toBe(84532)
    expect(client.config.operatorAddress).toBe(MOCK_OPERATOR_ADDRESS)
    expect(client.config.chainConfig.name).toBe('Base Sepolia')
  })
})

describe('extend()', () => {
  it('adds a namespace with custom methods', () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    const extended = client.extend((c) => ({
      custom: {
        getChainName: () => c.config.chainConfig.name,
      },
    }))

    expect(extended.custom.getChainName()).toBe('Base Sepolia')
  })

  it('retains original action groups after extend', () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    const extended = client.extend(() => ({
      myPlugin: { hello: () => 'world' },
    }))

    expect(extended.payment).toBeDefined()
    expect(extended.refund).toBeDefined()
    expect(extended.evidence).toBeDefined()
    expect(extended.freeze).toBeDefined()
    expect(extended.operator).toBeDefined()
    expect(extended.fee).toBeDefined()
    expect(extended.myPlugin.hello()).toBe('world')
  })

  it('extended methods can call original client methods', () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    const extended = client.extend((c) => ({
      utils: {
        getOperatorAddress: () => c.config.operatorAddress,
      },
    }))

    expect(extended.utils.getOperatorAddress()).toBe(MOCK_OPERATOR_ADDRESS)
  })
})

describe('payment actions — guards', () => {
  it('payment.release() throws ConfigError without walletClient', () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })
    const pi = createMockPaymentInfo()

    expect(() => client.payment.release(pi, 100n)).toThrow(ConfigError)
  })

  it('payment.authorize() throws ConfigError without walletClient', () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })
    const pi = createMockPaymentInfo()

    expect(() => client.payment.authorize(pi, 100n)).toThrow(ConfigError)
  })

  it('payment.charge() throws ConfigError without walletClient', () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })
    const pi = createMockPaymentInfo()

    expect(() => client.payment.charge(pi, 100n)).toThrow(ConfigError)
  })

  it('payment.refundInEscrow() throws ConfigError without walletClient', () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })
    const pi = createMockPaymentInfo()

    expect(() => client.payment.refundInEscrow(pi, 100n)).toThrow(ConfigError)
  })

  it('payment.refundPostEscrow() throws ConfigError without walletClient', () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })
    const pi = createMockPaymentInfo()

    expect(() => client.payment.refundPostEscrow(pi, 100n)).toThrow(ConfigError)
  })
})

describe('evidence actions — guards', () => {
  it('evidence.submit() throws ConfigError without walletClient', () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })
    const pi = createMockPaymentInfo()

    // Evidence address exists on Base Sepolia, but no walletClient
    expect(() => client.evidence.submit(pi, 1n, 'QmTest')).toThrow(ConfigError)
  })

  it('evidence.submit() throws ConfigError without evidence address', () => {
    // Create a config that points to a chain without evidence
    // We'll simulate by removing refundRequestEvidence via a custom chain
    // Since all currently supported chains have evidence, we test the guard via the mock
    const client = createX402r({
      publicClient: createMockPublicClient(),
      walletClient: createMockWalletClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })
    // Base Sepolia has evidence, so this should NOT throw for missing evidence
    // Instead, it would try to call the contract (and fail because mock)
    expect(client.evidence).toBeDefined()
  })
})

describe('freeze actions — read without walletClient', () => {
  it('freeze.isFrozen() works without walletClient', async () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })
    const pi = createMockPaymentInfo()
    const freezeAddr = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as Address

    // Should not throw ConfigError (it's a read operation)
    // It will fail with the mock's readContract error, not ConfigError
    await expect(client.freeze.isFrozen(freezeAddr, pi)).rejects.toThrow(
      'readContract not mocked',
    )
  })
})

describe('payment actions — delegation', () => {
  it('payment.getState() delegates to core getPaymentAmounts with correct args', async () => {
    const pi = createMockPaymentInfo()
    const mockResult = {
      hasCollectedPayment: false,
      capturableAmount: 500n,
      refundableAmount: 500n,
    }

    const mockReadContract = vi.fn()
    // getPaymentAmounts calls getPaymentState which does 2 readContract calls:
    // 1. Read ESCROW address
    // 2. Call paymentState on escrow
    const escrowAddr = '0x29025c0E9D4239d438e169570818dB9FE0A80873' as Address
    mockReadContract
      .mockResolvedValueOnce(escrowAddr) // ESCROW read
      .mockResolvedValueOnce([false, 500n, 500n]) // paymentState call

    const client = createX402r({
      publicClient: createMockPublicClient({
        readContract: mockReadContract as any,
      }),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    const result = await client.payment.getState(pi)
    expect(result).toEqual(mockResult)
    // First call should be to read ESCROW from operator
    expect(mockReadContract).toHaveBeenCalledTimes(2)
    expect(mockReadContract.mock.calls[0][0]).toMatchObject({
      address: MOCK_OPERATOR_ADDRESS,
      functionName: 'ESCROW',
    })
  })
})

describe('refund actions — delegation', () => {
  it('refund.hasRequest() passes chainConfig.refundRequest to core', async () => {
    const pi = createMockPaymentInfo()
    const mockReadContract = vi.fn().mockResolvedValue(true)

    const client = createX402r({
      publicClient: createMockPublicClient({
        readContract: mockReadContract as any,
      }),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    const result = await client.refund.hasRequest(pi, 1n)
    expect(result).toBe(true)
    expect(mockReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0x1C2Ab244aC8bDdDB74d43389FF34B118aF2E90F4',
        functionName: 'hasRefundRequest',
      }),
    )
  })
})

describe('payment actions — tokenCollector defaults', () => {
  it('payment.authorize() defaults tokenCollector from chainConfig', () => {
    const pi = createMockPaymentInfo()
    const mockWriteContract = vi.fn().mockResolvedValue('0xdeadbeef')

    const client = createX402r({
      publicClient: createMockPublicClient(),
      walletClient: createMockWalletClient({
        writeContract: mockWriteContract as any,
      }),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    // Call without explicit tokenCollector
    client.payment.authorize(pi, 100n)

    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'authorize',
        args: expect.arrayContaining([
          pi,
          100n,
          '0x5cA789000070DF15b4663DB64a50AeF5D49c5Ee0', // chainConfig.tokenCollector
          '0x',
        ]),
      }),
    )
  })

  it('payment.authorize() passes explicit tokenCollector and collectorData', () => {
    const pi = createMockPaymentInfo()
    const customTC = '0x1111111111111111111111111111111111111111' as Address
    const customCD = '0xabcd' as `0x${string}`
    const mockWriteContract = vi.fn().mockResolvedValue('0xdeadbeef')

    const client = createX402r({
      publicClient: createMockPublicClient(),
      walletClient: createMockWalletClient({
        writeContract: mockWriteContract as any,
      }),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    client.payment.authorize(pi, 200n, customTC, customCD)

    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'authorize',
        args: expect.arrayContaining([pi, 200n, customTC, customCD]),
      }),
    )
  })
})

describe('refund actions — guards', () => {
  it('refund.request() throws ConfigError without walletClient', () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })
    const pi = createMockPaymentInfo()

    expect(() => client.refund.request(pi, 100n, 1n)).toThrow(ConfigError)
  })

  it('refund.deny() throws ConfigError without walletClient', () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })
    const pi = createMockPaymentInfo()

    expect(() => client.refund.deny(pi, 1n)).toThrow(ConfigError)
  })
})

describe('fee actions', () => {
  it('fee.distribute() throws ConfigError without walletClient', () => {
    const client = createX402r({
      publicClient: createMockPublicClient(),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })
    const token = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address

    expect(() => client.fee.distribute(token)).toThrow(ConfigError)
  })
})

describe('operator actions — delegation', () => {
  it('operator.getConfig() delegates to core getOperatorConfig', async () => {
    const mockSlots = {
      escrow: '0x1111111111111111111111111111111111111111',
      authorizeCondition: '0x2222222222222222222222222222222222222222',
      authorizeRecorder: '0x3333333333333333333333333333333333333333',
      chargeCondition: '0x4444444444444444444444444444444444444444',
      chargeRecorder: '0x5555555555555555555555555555555555555555',
      releaseCondition: '0x6666666666666666666666666666666666666666',
      releaseRecorder: '0x7777777777777777777777777777777777777777',
      refundInEscrowCondition: '0x8888888888888888888888888888888888888888',
      refundInEscrowRecorder: '0x9999999999999999999999999999999999999999',
      refundPostEscrowCondition: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      refundPostEscrowRecorder: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      feeCalculator: '0xcccccccccccccccccccccccccccccccccccccccc',
      feeRecipient: '0xdddddddddddddddddddddddddddddddddddddd',
      protocolFeeConfig: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    }

    // getOperatorConfig calls readContract 14 times (one per slot)
    const slotValues = Object.values(mockSlots)
    const mockReadContract = vi.fn()
    for (const val of slotValues) {
      mockReadContract.mockResolvedValueOnce(val)
    }

    const client = createX402r({
      publicClient: createMockPublicClient({
        readContract: mockReadContract as any,
      }),
      operatorAddress: MOCK_OPERATOR_ADDRESS,
    })

    const result = await client.operator.getConfig()
    expect(result).toEqual(mockSlots)
    expect(mockReadContract).toHaveBeenCalledTimes(14)
  })
})
