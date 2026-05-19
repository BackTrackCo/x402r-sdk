import {
  deployMarketplaceOperator,
  getChainConfig,
  type PaymentInfo,
  signReceiveAuthorization,
} from '@x402r/core'
import {
  createArbiterClient,
  createMerchantClient,
  createPayerClient,
} from '@x402r/sdk'
import {
  type Address,
  createPublicClient,
  createTestClient,
  createWalletClient,
  encodeAbiParameters,
  erc20Abi,
  http,
  keccak256,
  pad,
  type TestClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { FAR_FUTURE, PAYMENT_AMOUNT } from './constants.js'
import type { ExampleContext, SetupOptions } from './types.js'

// ---------------------------------------------------------------------------
// Anvil test accounts (deterministic mnemonic)
// ---------------------------------------------------------------------------

const testAccounts = {
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
  feeReceiver: {
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

const allAccountAddresses = Object.values(testAccounts).map((a) => a.address)

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CHAIN_ID = 84532
const chainConfig = getChainConfig(CHAIN_ID)
const USDC = chainConfig.usdc
const USDC_BALANCE_SLOT = 9n
// FORK_BLOCK left undefined — Base Sepolia public RPC has a narrow archive
// horizon (~last few hundred blocks); pinning a historical block fails with
// "block not found" once the chain moves past it. Examples fork at upstream's
// latest by default.
const FORK_BLOCK: bigint | undefined = undefined
const ANVIL_PORT = 8846

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBalanceSlot(account: Address, baseSlot: bigint): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'address' }, { type: 'uint256' }],
      [account, baseSlot],
    ),
  )
}

// ---------------------------------------------------------------------------
// setup() — main entry point for per-action examples
// ---------------------------------------------------------------------------

export async function setup(options?: SetupOptions): Promise<ExampleContext> {
  const skipAuthorize = options?.authorize === false
  // 1. Start Anvil fork (two modes)
  //   a) Shared mode (CI orchestrator path): when SCENARIO_RPC_URL is set by
  //      examples/scripts/scenarios-ci.ts, reuse that prool subpath URL and
  //      skip spawning our own server. The orchestrator owns prool lifecycle,
  //      so cleanup is a no-op here. Each scenario gets a unique subpath, so
  //      prool routes each to its own forked Anvil child (no port collision).
  //   b) Standalone mode (e.g. `pnpm scenario:capture` direct invocation):
  //      spawn an isolated prool server on ANVIL_PORT and tear it down on
  //      cleanup. Preserves backward-compat for developers running one
  //      scenario locally.
  const sharedRpcUrl = process.env.SCENARIO_RPC_URL
  let rpcUrl: string
  let cleanup: () => Promise<void>

  if (sharedRpcUrl) {
    rpcUrl = sharedRpcUrl
    cleanup = async () => {}
  } else {
    const { Instance, Server } = await import('prool')
    const server = Server.create({
      instance: Instance.anvil({
        chainId: CHAIN_ID,
        forkUrl:
          process.env.VITE_ANVIL_FORK_URL_BASE_SEPOLIA ??
          'https://sepolia.base.org',
        forkBlockNumber: FORK_BLOCK,
      }),
      port: ANVIL_PORT,
    })
    await server.start()
    rpcUrl = `http://127.0.0.1:${ANVIL_PORT}/1`
    cleanup = async () => {
      await server.stop()
    }
  }

  const transport = http(rpcUrl)

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport,
    cacheTime: 0,
  })
  const testClient = createTestClient({
    chain: baseSepolia,
    transport,
    mode: 'anvil',
  }) as unknown as TestClient

  try {
    // 2. Clear contract code at test addresses (fixes ERC-3009 signer checks)
    for (const addr of allAccountAddresses) {
      await testClient.setCode({ address: addr, bytecode: '0x' })
    }

    // 3. Deploy marketplace operator via public API
    const deployerWallet = createWalletClient({
      account: testAccounts.deployer.address,
      chain: baseSepolia,
      transport,
    })

    const deployment = await deployMarketplaceOperator(
      deployerWallet,
      publicClient,
      {
        chainId: CHAIN_ID,
        feeReceiver: testAccounts.feeReceiver.address,
        arbiter: testAccounts.arbiter.address,
        escrowPeriodSeconds: 604_800n, // 7 days
        freezeDurationSeconds: 604_800n, // 7 days (enables freeze support)
        operatorFeeBps: 50n,
      },
    )

    const operatorAddress = deployment.operatorAddress

    // 4. Fund payer with USDC via storage slot manipulation
    const payerUsdcAmount = 10_000_000_000n // 10,000 USDC
    const payerSlot = getBalanceSlot(
      testAccounts.payer.address,
      USDC_BALANCE_SLOT,
    )
    await testClient.setStorageAt({
      address: USDC,
      index: payerSlot,
      value: pad(`0x${payerUsdcAmount.toString(16)}` as `0x${string}`),
    })

    const payerBalance = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testAccounts.payer.address],
    })
    if (payerBalance === 0n) {
      const fallbackSlot = getBalanceSlot(testAccounts.payer.address, 0n)
      await testClient.setStorageAt({
        address: USDC,
        index: fallbackSlot,
        value: pad(`0x${payerUsdcAmount.toString(16)}` as `0x${string}`),
      })
    }

    // 5. Create role-specific SDK clients
    const payerWallet = createWalletClient({
      account: testAccounts.payer.address,
      chain: baseSepolia,
      transport,
    })
    const merchantWallet = createWalletClient({
      account: testAccounts.receiver.address,
      chain: baseSepolia,
      transport,
    })
    const arbiterWallet = createWalletClient({
      account: testAccounts.arbiter.address,
      chain: baseSepolia,
      transport,
    })

    const clientConfig = {
      publicClient,
      operatorAddress,
      escrowPeriodAddress: deployment.escrowPeriodAddress,
      freezeAddress: deployment.freezeAddress ?? undefined,
      refundRequestAddress: deployment.refundRequestAddress,
      refundRequestEvidenceAddress: deployment.refundRequestEvidenceAddress,
    }

    const payer = createPayerClient({
      ...clientConfig,
      walletClient: payerWallet,
    })
    const merchant = createMerchantClient({
      ...clientConfig,
      walletClient: merchantWallet,
    })
    const arbiter = createArbiterClient({
      ...clientConfig,
      walletClient: arbiterWallet,
    })

    // 6. Build paymentInfo and optionally authorize a payment
    const paymentInfo: PaymentInfo = {
      operator: operatorAddress,
      payer: testAccounts.payer.address,
      receiver: testAccounts.receiver.address,
      token: USDC,
      maxAmount: PAYMENT_AMOUNT,
      preApprovalExpiry: FAR_FUTURE,
      authorizationExpiry: FAR_FUTURE,
      refundExpiry: FAR_FUTURE,
      minFeeBps: 0,
      maxFeeBps: 500,
      feeReceiver: operatorAddress,
      salt: 1n,
    }

    if (!skipAuthorize) {
      const payerAccount = privateKeyToAccount(testAccounts.payer.privateKey)
      const { collectorData, tokenCollector } = await signReceiveAuthorization({
        account: payerAccount,
        chainId: CHAIN_ID,
        paymentInfo,
      })

      const authTx = await merchant.payment.authorize(
        paymentInfo,
        PAYMENT_AMOUNT,
        tokenCollector,
        collectorData,
      )
      await publicClient.waitForTransactionReceipt({ hash: authTx })

      console.log('Setup complete — payment authorized in escrow\n')
    } else {
      console.log('Setup complete — authorization skipped\n')
    }

    const waitForTx = async (hash: `0x${string}`) => {
      await publicClient.waitForTransactionReceipt({ hash })
    }

    return {
      payer,
      merchant,
      arbiter,
      paymentInfo,
      publicClient,
      testClient,
      accounts: {
        payer: testAccounts.payer.address,
        merchant: testAccounts.receiver.address,
        arbiter: testAccounts.arbiter.address,
      },
      operatorAddress,
      PAYMENT_AMOUNT,
      rpcUrl,
      cleanup,
      waitForTx,
    }
  } catch (error) {
    await cleanup()
    throw error
  }
}
