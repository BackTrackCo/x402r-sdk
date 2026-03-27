import { getAddress, recoverTypedDataAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { describe, expect, it } from 'vitest'
import { getChainConfig } from '../src/config/index.js'
import { ConfigError } from '../src/errors/index.js'
import { signReceiveAuthorization } from '../src/payment/erc3009.js'
import { computeEscrowNonce } from '../src/payment/hashing.js'

// Import internal-only type constant for recovery verification
const RECEIVE_AUTHORIZATION_TYPES = {
  ReceiveWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const

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
  it('signature recovers to the correct signer', async () => {
    const chainId = 84532
    const chainConfig = getChainConfig(chainId)
    const { collectorData, tokenCollector } = await signReceiveAuthorization({
      account,
      chainId,
      paymentInfo,
    })

    const nonce = computeEscrowNonce(
      chainId,
      chainConfig.authCaptureEscrow,
      paymentInfo,
    )

    const recovered = await recoverTypedDataAddress({
      domain: {
        name: 'USDC',
        version: '2',
        chainId,
        verifyingContract: getAddress(paymentInfo.token),
      },
      types: RECEIVE_AUTHORIZATION_TYPES,
      primaryType: 'ReceiveWithAuthorization',
      message: {
        from: getAddress(account.address),
        to: getAddress(tokenCollector),
        value: paymentInfo.maxAmount,
        validAfter: 0n,
        validBefore: BigInt(paymentInfo.preApprovalExpiry),
        nonce,
      },
      signature: collectorData,
    })

    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase())
  })

  it('returns the correct tokenCollector from chain config', async () => {
    const { tokenCollector } = await signReceiveAuthorization({
      account,
      chainId: 84532,
      paymentInfo,
    })

    // Known Base Sepolia tokenCollector
    expect(tokenCollector).toBe('0x9A12A116a44636F55c9e135189A1321Abcfe2f30')
  })

  it('different paymentInfo produces different signature', async () => {
    const r1 = await signReceiveAuthorization({
      account,
      chainId: 84532,
      paymentInfo,
    })
    const r2 = await signReceiveAuthorization({
      account,
      chainId: 84532,
      paymentInfo: { ...paymentInfo, salt: 2n },
    })

    expect(r1.collectorData).not.toBe(r2.collectorData)
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

  it('tokenName / tokenVersion override changes signature domain', async () => {
    const chainId = 84532
    const chainConfig = getChainConfig(chainId)

    const { collectorData, tokenCollector } = await signReceiveAuthorization({
      account,
      chainId,
      paymentInfo,
      tokenName: 'CustomToken',
      tokenVersion: '3',
    })

    const nonce = computeEscrowNonce(
      chainId,
      chainConfig.authCaptureEscrow,
      paymentInfo,
    )

    // Recovery with the matching custom domain must succeed
    const recovered = await recoverTypedDataAddress({
      domain: {
        name: 'CustomToken',
        version: '3',
        chainId,
        verifyingContract: getAddress(paymentInfo.token),
      },
      types: RECEIVE_AUTHORIZATION_TYPES,
      primaryType: 'ReceiveWithAuthorization',
      message: {
        from: getAddress(account.address),
        to: getAddress(tokenCollector),
        value: paymentInfo.maxAmount,
        validAfter: 0n,
        validBefore: BigInt(paymentInfo.preApprovalExpiry),
        nonce,
      },
      signature: collectorData,
    })
    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase())
  })

  it('tokenCollector override is returned and used in signature', async () => {
    const chainId = 84532
    const chainConfig = getChainConfig(chainId)
    const customCollector =
      '0x1111111111111111111111111111111111111111' as `0x${string}`

    const { collectorData, tokenCollector } = await signReceiveAuthorization({
      account,
      chainId,
      paymentInfo,
      tokenCollector: customCollector,
    })

    expect(tokenCollector).toBe(getAddress(customCollector))

    const nonce = computeEscrowNonce(
      chainId,
      chainConfig.authCaptureEscrow,
      paymentInfo,
    )

    const recovered = await recoverTypedDataAddress({
      domain: {
        name: 'USDC',
        version: '2',
        chainId,
        verifyingContract: getAddress(paymentInfo.token),
      },
      types: RECEIVE_AUTHORIZATION_TYPES,
      primaryType: 'ReceiveWithAuthorization',
      message: {
        from: getAddress(account.address),
        to: getAddress(customCollector),
        value: paymentInfo.maxAmount,
        validAfter: 0n,
        validBefore: BigInt(paymentInfo.preApprovalExpiry),
        nonce,
      },
      signature: collectorData,
    })
    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase())
  })

  it('escrowAddress override produces different nonce', async () => {
    const chainId = 84532
    const customEscrow =
      '0x2222222222222222222222222222222222222222' as `0x${string}`

    const defaultResult = await signReceiveAuthorization({
      account,
      chainId,
      paymentInfo,
    })
    const customResult = await signReceiveAuthorization({
      account,
      chainId,
      paymentInfo,
      escrowAddress: customEscrow,
    })

    // Different escrow address → different nonce → different signature
    expect(customResult.collectorData).not.toBe(defaultResult.collectorData)
  })
})
