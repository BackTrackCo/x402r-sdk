import { getChainConfig } from '@x402r/core'
import {
  type Address,
  createPublicClient,
  createWalletClient,
  erc20Abi,
  http,
  isHex,
  type PublicClient,
  type WalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface E2EAccounts {
  deployer: { address: Address; walletClient: WalletClient }
  payer: { address: Address; walletClient: WalletClient }
  merchant: { address: Address; walletClient: WalletClient }
  arbiter: { address: Address; walletClient: WalletClient }
  publicClient: PublicClient
  chainId: number
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export async function setupE2EAccounts(
  privateKey: string,
): Promise<E2EAccounts> {
  // Validate key format
  if (!isHex(privateKey) || privateKey.length !== 66) {
    throw new Error(
      'PRIVATE_KEY must be a 66-character hex string (0x + 64 hex chars)',
    )
  }

  const rpcUrl = process.env.RPC_URL ?? 'https://sepolia.base.org'
  const chainId = Number(process.env.NETWORK_ID ?? 84532)
  const chainConfig = getChainConfig(chainId)

  const transport = http(rpcUrl)
  const publicClient: PublicClient = createPublicClient({ transport })

  // For simplicity, all roles use the same key in scenarios
  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const address = account.address

  const makeWallet = (): WalletClient =>
    createWalletClient({
      account,
      chain: baseSepolia,
      transport,
    })

  // Check USDC balance
  const usdcBalance = await publicClient.readContract({
    address: chainConfig.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  })

  const ethBalance = await publicClient.getBalance({ address })

  console.log(`Account: ${address}`)
  console.log(`ETH balance: ${ethBalance}`)
  console.log(`USDC balance: ${usdcBalance}`)

  if (ethBalance === 0n) {
    throw new Error(
      'Account has no ETH — fund via https://portal.cdp.coinbase.com/products/faucet',
    )
  }

  return {
    deployer: { address, walletClient: makeWallet() },
    payer: { address, walletClient: makeWallet() },
    merchant: { address, walletClient: makeWallet() },
    arbiter: { address, walletClient: makeWallet() },
    publicClient,
    chainId,
  }
}
