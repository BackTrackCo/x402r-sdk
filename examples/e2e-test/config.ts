/**
 * Constants and utility helpers shared across the E2E test suite.
 */

import type { PublicClient } from 'viem'

// ============ Config Constants ============

export const NETWORK_ID = process.env.NETWORK_ID ?? 'eip155:84532'
export const RPC_URL = process.env.RPC_URL ?? 'https://sepolia.base.org'
export const PAYMENT_AMOUNT = 10000n // 0.01 USDC (6 decimals)
export const GAS_FUNDING = 10000000000000n // 0.00001 ETH per derived account
export const SCANNER = 'https://sepolia.basescan.org'

// ============ Helpers ============

export function shortAddr(addr: string): string {
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function waitForTx(
  publicClient: PublicClient,
  hash: `0x${string}`,
) {
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
  })
  if (receipt.status !== 'success') {
    throw new Error(`Transaction reverted: ${hash}`)
  }
  await sleep(2000)
  return receipt
}
