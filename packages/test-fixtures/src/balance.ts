import type { Address, PublicClient, TestClient } from 'viem'
import { encodeAbiParameters, erc20Abi, keccak256, pad } from 'viem'
import { PAYER_USDC_FUNDING_AMOUNT, USDC_BALANCE_SLOT } from './constants.js'

// ---------------------------------------------------------------------------
// USDC balance-slot machinery + anvil state helpers shared by every fork
// harness. Stateless: no anvil lifecycle, just storage/code manipulation
// against a supplied TestClient.
// ---------------------------------------------------------------------------

/** Compute the storage slot for `balanceOf[account]` in a Solidity mapping. */
export function getBalanceSlot(
  account: Address,
  baseSlot: bigint,
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'address' }, { type: 'uint256' }],
      [account, baseSlot],
    ),
  )
}

/**
 * Clear contract code at the given addresses.
 *
 * On Base Sepolia, standard Anvil/Hardhat addresses have contracts deployed.
 * USDC FiatTokenV2_2 uses OZ SignatureChecker which checks signer.code.length —
 * if code exists, it skips ecrecover and tries EIP-1271 instead, breaking
 * ERC-3009. Clearing the code restores the direct-EOA signature path.
 */
export async function clearTestAccountCode(
  testClient: TestClient,
  addresses: readonly Address[],
): Promise<void> {
  for (const address of addresses) {
    await testClient.setCode({ address, bytecode: '0x' })
  }
}

/**
 * Fund the payer with USDC via storage-slot manipulation.
 *
 * Writes slot 9 (Base Sepolia USDC FiatTokenV2_2 balance mapping), probes
 * balanceOf, and falls back to slot 0 if the first write didn't land. Throws
 * if both writes fail to register a balance.
 */
export async function fundPayerUsdc(options: {
  publicClient: PublicClient
  testClient: TestClient
  usdc: Address
  payer: Address
  amount?: bigint
}): Promise<void> {
  const { publicClient, testClient, usdc, payer } = options
  const amount = options.amount ?? PAYER_USDC_FUNDING_AMOUNT

  const payerSlot = getBalanceSlot(payer, USDC_BALANCE_SLOT)
  await testClient.setStorageAt({
    address: usdc,
    index: payerSlot,
    value: pad(`0x${amount.toString(16)}` as `0x${string}`),
  })

  const payerBalance = await publicClient.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [payer],
  })

  if (payerBalance === 0n) {
    const fallbackSlot = getBalanceSlot(payer, 0n)
    await testClient.setStorageAt({
      address: usdc,
      index: fallbackSlot,
      value: pad(`0x${amount.toString(16)}` as `0x${string}`),
    })

    const retryBalance = await publicClient.readContract({
      address: usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [payer],
    })
    if (retryBalance === 0n) {
      throw new Error(
        'Failed to fund payer — USDC storage slot unknown (tried slots 9 and 0)',
      )
    }
  }
}
