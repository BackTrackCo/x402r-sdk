/**
 * E2E account setup, balance checking, and derived account funding.
 */

import {
  fromNetworkId,
  getChainConfig,
  type X402rChainConfig,
} from '@x402r/core'
import {
  type Address,
  createPublicClient,
  createWalletClient,
  erc20Abi,
  formatEther,
  formatUnits,
  http,
  type PublicClient,
  type WalletClient,
} from 'viem'
import {
  english,
  generateMnemonic,
  mnemonicToAccount,
  privateKeyToAccount,
} from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

import {
  GAS_FUNDING,
  NETWORK_ID,
  PAYMENT_AMOUNT,
  RPC_URL,
  SCANNER,
  waitForTx,
} from './config.js'
import type { StepRunner } from './runner.js'

// ============ Types ============

export interface E2EAccounts {
  payerAccount: ReturnType<typeof privateKeyToAccount>
  merchantAccount: ReturnType<typeof mnemonicToAccount>
  arbiterAccount?: ReturnType<typeof mnemonicToAccount>
  publicClient: PublicClient
  payerWallet: WalletClient
  merchantWallet: WalletClient
  arbiterWallet?: WalletClient
  chainConfig: X402rChainConfig
  chainId: number
}

// ============ Setup ============

export async function setupE2EAccounts(
  privateKey: `0x${string}`,
  opts?: { derivedCount?: number },
): Promise<E2EAccounts> {
  const derivedCount = opts?.derivedCount ?? 2
  const mnemonic = generateMnemonic(english)

  const payerAccount = privateKeyToAccount(privateKey)
  const merchantAccount = mnemonicToAccount(mnemonic, { addressIndex: 0 })
  const arbiterAccount =
    derivedCount >= 2
      ? mnemonicToAccount(mnemonic, { addressIndex: 1 })
      : undefined

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  })

  const payerWallet = createWalletClient({
    account: payerAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  })

  const merchantWallet = createWalletClient({
    account: merchantAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  })

  const arbiterWallet = arbiterAccount
    ? createWalletClient({
        account: arbiterAccount,
        chain: baseSepolia,
        transport: http(RPC_URL),
      })
    : undefined

  const chainId = fromNetworkId(NETWORK_ID)
  const chainConfig = getChainConfig(chainId)

  return {
    payerAccount,
    merchantAccount,
    arbiterAccount,
    publicClient,
    payerWallet,
    merchantWallet,
    arbiterWallet,
    chainConfig,
    chainId,
  }
}

// ============ Balance Checks ============

export async function checkAndLogBalances(
  accounts: E2EAccounts,
  runner: StepRunner,
): Promise<void> {
  const { publicClient, payerAccount, chainConfig } = accounts
  const ethBalance = await publicClient.getBalance({
    address: payerAccount.address,
  })
  const usdcBalance = await publicClient.readContract({
    address: chainConfig.usdc as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [payerAccount.address],
  })

  runner.log(`Payer ETH balance:  ${formatEther(ethBalance)} ETH`)
  runner.log(`Payer USDC balance: ${formatUnits(usdcBalance, 6)} USDC`)

  const minEth = GAS_FUNDING * BigInt(accounts.arbiterAccount ? 5 : 3)
  if (ethBalance < minEth) {
    console.error(
      `Error: Insufficient ETH. Need at least ${formatEther(minEth)} ETH for gas.`,
    )
    process.exit(1)
  }
  if (usdcBalance < PAYMENT_AMOUNT) {
    console.error(
      `Error: Insufficient USDC. Need at least ${formatUnits(PAYMENT_AMOUNT, 6)} USDC.`,
    )
    process.exit(1)
  }
}

// ============ Funding ============

export async function fundDerivedAccounts(
  accounts: E2EAccounts,
  runner: StepRunner,
): Promise<void> {
  const {
    payerWallet,
    payerAccount,
    merchantAccount,
    arbiterAccount,
    publicClient,
  } = accounts

  runner.log('Funding merchant with ETH for gas...')
  const fundMerchantTx = await payerWallet.sendTransaction({
    to: merchantAccount.address,
    value: GAS_FUNDING,
    chain: baseSepolia,
    account: payerAccount,
  })
  await waitForTx(publicClient, fundMerchantTx)
  runner.log(`  Funded merchant: ${SCANNER}/tx/${fundMerchantTx}`)

  if (arbiterAccount) {
    runner.log('Funding arbiter with ETH for gas...')
    const fundArbiterTx = await payerWallet.sendTransaction({
      to: arbiterAccount.address,
      value: GAS_FUNDING,
      chain: baseSepolia,
      account: payerAccount,
    })
    await waitForTx(publicClient, fundArbiterTx)
    runner.log(`  Funded arbiter: ${SCANNER}/tx/${fundArbiterTx}`)
  }
}
