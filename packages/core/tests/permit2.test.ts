import {
  decodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  getAddress,
  recoverTypedDataAddress,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { describe, expect, it } from 'vitest'
import { getChainConfig } from '../src/config/index.js'
import { ConfigError } from '../src/errors/index.js'
import { computeEscrowNonce } from '../src/payment/hashing.js'
import {
  createPermit2ApprovalTx,
  getPermit2AllowanceReadParams,
  PERMIT2_ADDRESS,
  signPermit2Authorization,
} from '../src/payment/permit2.js'

// Permit2 EIP-712 types used for signature recovery
const PERMIT2_TRANSFER_FROM_TYPES = {
  PermitTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
  TokenPermissions: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
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

describe('signPermit2Authorization', () => {
  it('signature recovers to the signer over PermitTransferFrom', async () => {
    const chainId = 84532
    const chainConfig = getChainConfig(chainId)
    const { collectorData, tokenCollector } = await signPermit2Authorization({
      account,
      chainId,
      paymentInfo,
    })

    // collectorData is abi.encode(bytes signature) — unwrap before recovering
    const [signature] = decodeAbiParameters([{ type: 'bytes' }], collectorData)

    const nonce = BigInt(
      computeEscrowNonce(chainId, chainConfig.authCaptureEscrow, paymentInfo),
    )

    const recovered = await recoverTypedDataAddress({
      domain: {
        name: 'Permit2',
        chainId,
        verifyingContract: PERMIT2_ADDRESS,
      },
      types: PERMIT2_TRANSFER_FROM_TYPES,
      primaryType: 'PermitTransferFrom',
      message: {
        permitted: {
          token: getAddress(paymentInfo.token),
          amount: paymentInfo.maxAmount,
        },
        spender: getAddress(tokenCollector),
        nonce,
        deadline: BigInt(paymentInfo.preApprovalExpiry),
      },
      signature: signature as `0x${string}`,
    })

    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase())
  })

  it('returns the canonical Permit2 token collector', async () => {
    const { tokenCollector } = await signPermit2Authorization({
      account,
      chainId: 84532,
      paymentInfo,
    })

    // Canonical Permit2PaymentCollector (commerce-payments at v1.0.0, base deployment)
    expect(tokenCollector).toBe('0x992476B9Ee81d52a5BdA0622C333938D0Af0aB26')
  })

  it('collectorData is abi-encoded bytes, not the raw signature', async () => {
    const { collectorData } = await signPermit2Authorization({
      account,
      chainId: 84532,
      paymentInfo,
    })

    // Raw EIP-712 signatures are 65 bytes = 132 chars after 0x. abi.encode wraps
    // them in a 32-byte offset + 32-byte length + padded bytes payload, so the
    // hex string is meaningfully longer than a raw signature.
    expect(collectorData.length).toBeGreaterThan(132 + 2)

    // Must round-trip through decodeAbiParameters cleanly.
    const [unwrapped] = decodeAbiParameters([{ type: 'bytes' }], collectorData)
    expect((unwrapped as `0x${string}`).length).toBe(132) // 0x + 65 bytes
  })

  it('different salt produces a different signature', async () => {
    const r1 = await signPermit2Authorization({
      account,
      chainId: 84532,
      paymentInfo,
    })
    const r2 = await signPermit2Authorization({
      account,
      chainId: 84532,
      paymentInfo: { ...paymentInfo, salt: 2n },
    })

    expect(r1.collectorData).not.toBe(r2.collectorData)
  })

  it('throws ConfigError for unsupported chainId', async () => {
    await expect(
      signPermit2Authorization({
        account,
        chainId: 999999,
        paymentInfo,
      }),
    ).rejects.toThrow(ConfigError)
  })

  it('tokenCollector override is returned and used as spender', async () => {
    const chainId = 84532
    const chainConfig = getChainConfig(chainId)
    const customCollector =
      '0x1111111111111111111111111111111111111111' as `0x${string}`

    const { collectorData, tokenCollector } = await signPermit2Authorization({
      account,
      chainId,
      paymentInfo,
      tokenCollector: customCollector,
    })

    expect(tokenCollector).toBe(getAddress(customCollector))

    const [signature] = decodeAbiParameters([{ type: 'bytes' }], collectorData)
    const nonce = BigInt(
      computeEscrowNonce(chainId, chainConfig.authCaptureEscrow, paymentInfo),
    )

    // Recovery must succeed when the recovered message uses the custom spender.
    const recovered = await recoverTypedDataAddress({
      domain: {
        name: 'Permit2',
        chainId,
        verifyingContract: PERMIT2_ADDRESS,
      },
      types: PERMIT2_TRANSFER_FROM_TYPES,
      primaryType: 'PermitTransferFrom',
      message: {
        permitted: {
          token: getAddress(paymentInfo.token),
          amount: paymentInfo.maxAmount,
        },
        spender: getAddress(customCollector),
        nonce,
        deadline: BigInt(paymentInfo.preApprovalExpiry),
      },
      signature: signature as `0x${string}`,
    })
    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase())
  })

  it('escrowAddress override produces a different signature', async () => {
    const chainId = 84532
    const customEscrow =
      '0x2222222222222222222222222222222222222222' as `0x${string}`

    const defaultResult = await signPermit2Authorization({
      account,
      chainId,
      paymentInfo,
    })
    const customResult = await signPermit2Authorization({
      account,
      chainId,
      paymentInfo,
      escrowAddress: customEscrow,
    })

    // Different escrow address → different nonce → different signature
    expect(customResult.collectorData).not.toBe(defaultResult.collectorData)
  })
})

describe('createPermit2ApprovalTx', () => {
  it('produces ERC20.approve(PERMIT2_ADDRESS, MAX_UINT256) calldata for the given token', () => {
    const token = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`
    const tx = createPermit2ApprovalTx(token)

    expect(tx.to).toBe(getAddress(token))

    const MAX_UINT256 =
      0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn
    const expected = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [PERMIT2_ADDRESS, MAX_UINT256],
    })
    expect(tx.data).toBe(expected)
  })

  it('PERMIT2_ADDRESS matches the canonical Uniswap Permit2 deployment', () => {
    // Same address on every chain — https://github.com/Uniswap/permit2
    expect(PERMIT2_ADDRESS).toBe('0x000000000022D473030F116dDEE9F6B43aC78BA3')
  })
})

describe('getPermit2AllowanceReadParams', () => {
  it('returns readContract args for ERC20.allowance(owner, PERMIT2_ADDRESS)', () => {
    const token = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`
    const owner = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as `0x${string}`

    const params = getPermit2AllowanceReadParams({
      tokenAddress: token,
      ownerAddress: owner,
    })

    expect(params.address).toBe(getAddress(token))
    expect(params.functionName).toBe('allowance')
    expect(params.args).toEqual([getAddress(owner), PERMIT2_ADDRESS])
  })
})
