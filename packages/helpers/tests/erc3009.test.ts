import { ConfigError } from '@x402r/core/errors'
import { privateKeyToAccount } from 'viem/accounts'
import { describe, expect, it } from 'vitest'
import { signReceiveAuthorization } from '../src/index.js'

const TEST_PRIVATE_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const

const account = privateKeyToAccount(TEST_PRIVATE_KEY)

const paymentInfo = {
  operator: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as `0x${string}`,
  payer: account.address,
  receiver: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as `0x${string}`,
  token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
  maxAmount: 1_000_000n,
  preApprovalExpiry: 281_474_976_710_655,
  authorizationExpiry: 281_474_976_710_655,
  refundExpiry: 281_474_976_710_655,
  minFeeBps: 0,
  maxFeeBps: 500,
  feeReceiver: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as `0x${string}`,
  salt: 1n,
}

describe('signReceiveAuthorization', () => {
  it('returns a valid hex signature of expected length', async () => {
    const { collectorData } = await signReceiveAuthorization({
      account,
      chainId: 84532,
      paymentInfo,
    })

    // 65 bytes = 130 hex chars + 0x prefix = 132
    expect(collectorData).toMatch(/^0x[0-9a-f]{130}$/i)
  })

  it('returns the correct tokenCollector from chain config', async () => {
    const { tokenCollector } = await signReceiveAuthorization({
      account,
      chainId: 84532,
      paymentInfo,
    })

    // Known Base Sepolia tokenCollector
    expect(tokenCollector).toBe('0xcE66Ab399EDA513BD12760b6427C87D6602344a7')
  })

  it('is deterministic — same inputs produce same signature', async () => {
    const params = { account, chainId: 84532, paymentInfo }
    const result1 = await signReceiveAuthorization(params)
    const result2 = await signReceiveAuthorization(params)

    expect(result1.collectorData).toBe(result2.collectorData)
    expect(result1.tokenCollector).toBe(result2.tokenCollector)
  })

  it('throws for unsupported chainId', async () => {
    await expect(
      signReceiveAuthorization({
        account,
        chainId: 999999,
        paymentInfo,
      }),
    ).rejects.toThrow(ConfigError)
  })
})
