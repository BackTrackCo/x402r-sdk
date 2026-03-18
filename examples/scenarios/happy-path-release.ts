import {
  computeEscrowNonce,
  deployMarketplaceOperator,
  getChainConfig,
  type PaymentInfo,
} from '@x402r/core'
import { createMerchantClient } from '@x402r/sdk'
import type { Address } from 'viem'
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  encodeAbiParameters,
  getAddress,
  http,
  keccak256,
  type PublicClient,
  pad,
  type TestClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import {
  ESCROW_FAST_FORWARD,
  FAR_FUTURE,
  PAYMENT_AMOUNT,
} from '../shared/constants.js'
import { StepRunner } from './runner.js'

// ---------------------------------------------------------------------------
// Anvil test accounts
// ---------------------------------------------------------------------------

const accounts = {
  deployer: {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address,
    privateKey:
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const,
  },
  payer: {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
    privateKey:
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const,
  },
  receiver: {
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Address,
    privateKey:
      '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as const,
  },
  feeRecipient: {
    address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906' as Address,
    privateKey:
      '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' as const,
  },
  arbiter: {
    address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65' as Address,
    privateKey:
      '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' as const,
  },
} as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHAIN_ID = 84532
const chainConfig = getChainConfig(CHAIN_ID)
const USDC = chainConfig.usdc

function getBalanceSlot(account: Address, baseSlot: bigint): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'address' }, { type: 'uint256' }],
      [account, baseSlot],
    ),
  )
}

// ---------------------------------------------------------------------------
// Scenario: Happy Path Release
// authorize → charge → release (2 roles: payer + merchant)
// ---------------------------------------------------------------------------

async function main() {
  // Start anvil
  const { Instance, Server } = await import('prool')
  const server = Server.create({
    instance: Instance.anvil({
      chainId: CHAIN_ID,
      forkUrl:
        process.env.VITE_ANVIL_FORK_URL_BASE_SEPOLIA ??
        'https://sepolia.base.org',
      forkBlockNumber: 38_945_000n,
    }),
    port: 8847,
  })
  await server.start()

  const rpcUrl = 'http://127.0.0.1:8847/1'
  const transport = http(rpcUrl)
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport,
    cacheTime: 0,
  }) as unknown as PublicClient
  const testClient = createTestClient({
    chain: baseSepolia,
    transport,
    mode: 'anvil',
  }) as unknown as TestClient
  const runner = new StepRunner('Happy Path Release', publicClient)

  try {
    // Clear contract code at test addresses
    for (const acct of Object.values(accounts)) {
      await testClient.setCode({ address: acct.address, bytecode: '0x' })
    }

    // --- Step 1: Deploy ---
    runner.step('Deploy marketplace operator')
    const deployerWallet = createWalletClient({
      account: accounts.deployer.address,
      chain: baseSepolia,
      transport,
    })
    const deployment = await deployMarketplaceOperator(
      deployerWallet,
      publicClient,
      {
        chainId: CHAIN_ID,
        feeRecipient: accounts.feeRecipient.address,
        arbiter: accounts.arbiter.address,
        escrowPeriodSeconds: 604_800n,
        operatorFeeBps: 50n,
      },
    )
    runner.log(`Operator deployed: ${deployment.operatorAddress}`)

    // Fund payer
    const payerSlot = getBalanceSlot(accounts.payer.address, 9n)
    await testClient.setStorageAt({
      address: USDC,
      index: payerSlot,
      value: pad(`0x${(10_000_000_000n).toString(16)}` as `0x${string}`),
    })

    // Create merchant client
    const merchantWallet = createWalletClient({
      account: accounts.receiver.address,
      chain: baseSepolia,
      transport,
    })

    const clientConfig = {
      publicClient,
      operatorAddress: deployment.operatorAddress,
      escrowPeriodAddress: deployment.escrowPeriodAddress,
      refundRequestAddress: deployment.refundRequestAddress,
    }

    const merchant = createMerchantClient({
      ...clientConfig,
      walletClient: merchantWallet,
    })

    // --- Step 2: Authorize payment (HTTP 402 flow) ---
    runner.step('Authorize payment via HTTP 402 flow')
    const paymentInfo: PaymentInfo = {
      operator: deployment.operatorAddress,
      payer: accounts.payer.address,
      receiver: accounts.receiver.address,
      token: USDC,
      maxAmount: PAYMENT_AMOUNT,
      preApprovalExpiry: FAR_FUTURE,
      authorizationExpiry: FAR_FUTURE,
      refundExpiry: FAR_FUTURE,
      minFeeBps: 0,
      maxFeeBps: 500,
      feeReceiver: deployment.operatorAddress,
      salt: 100n,
    }

    const localAccount = privateKeyToAccount(accounts.payer.privateKey)
    const nonce = computeEscrowNonce(
      CHAIN_ID,
      chainConfig.authCaptureEscrow,
      paymentInfo,
    )
    const signature = await localAccount.signTypedData({
      domain: {
        name: 'USDC',
        version: '2',
        chainId: CHAIN_ID,
        verifyingContract: getAddress(USDC),
      },
      types: {
        ReceiveWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' },
        ],
      },
      primaryType: 'ReceiveWithAuthorization',
      message: {
        from: getAddress(accounts.payer.address),
        to: getAddress(chainConfig.tokenCollector),
        value: PAYMENT_AMOUNT,
        validAfter: 0n,
        validBefore: BigInt(FAR_FUTURE),
        nonce,
      },
    })

    const authTx = await merchant.payment.authorize(
      paymentInfo,
      PAYMENT_AMOUNT,
      chainConfig.tokenCollector,
      signature,
    )
    runner.log(`Authorized: ${authTx}`)

    const amounts1 = await merchant.payment.getAmounts(paymentInfo)
    runner.assert(
      amounts1.hasCollectedPayment,
      'Payment collected after authorize',
    )

    // --- Step 3: Charge ---
    runner.step('Merchant charges payment')
    const chargeSig = await localAccount.signTypedData({
      domain: {
        name: 'USDC',
        version: '2',
        chainId: CHAIN_ID,
        verifyingContract: getAddress(USDC),
      },
      types: {
        ReceiveWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' },
        ],
      },
      primaryType: 'ReceiveWithAuthorization',
      message: {
        from: getAddress(accounts.payer.address),
        to: getAddress(chainConfig.tokenCollector),
        value: PAYMENT_AMOUNT,
        validAfter: 0n,
        validBefore: BigInt(FAR_FUTURE),
        nonce,
      },
    })

    const chargeTx = await merchant.payment.charge(
      paymentInfo,
      PAYMENT_AMOUNT,
      chainConfig.tokenCollector,
      chargeSig,
    )
    runner.log(`Charged: ${chargeTx}`)

    const amounts2 = await merchant.payment.getAmounts(paymentInfo)
    runner.assert(
      amounts2.hasCollectedPayment,
      'Payment still collected after charge',
    )

    // --- Step 4: Release after escrow ---
    runner.step('Release remaining after escrow expires')
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    const releaseTx = await merchant.payment.release(
      paymentInfo,
      PAYMENT_AMOUNT,
    )
    runner.log(`Released: ${releaseTx}`)

    const amounts3 = await merchant.payment.getAmounts(paymentInfo)
    runner.assert(
      amounts3.capturableAmount === 0n,
      'Capturable amount === 0 after release',
    )

    runner.done()
  } finally {
    await server.stop()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
