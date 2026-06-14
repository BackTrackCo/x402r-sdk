import type { Address, Hex, WalletClient } from 'viem'
import {
  encodeFunctionData,
  erc20Abi,
  getAddress,
  maxUint256,
  zeroAddress,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { x402rChains } from '../../src/config/index.js'
import { computePaymentInfoHash } from '../../src/payment/hashing.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { accounts } from './constants.js'

const baseSepolia = x402rChains[84532]
const CHAIN_ID = 84532

/**
 * Canonical Uniswap Permit2 contract — same address on every chain it's
 * deployed to. Pinned as a literal here (test infra) rather than imported,
 * matching the literal-pin precedent in
 * examples/scenarios/http-wire-capture.ts. https://github.com/Uniswap/permit2
 */
const PERMIT2_ADDRESS =
  '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const satisfies Address

// Plain Permit2 PermitTransferFrom (no witness). The x402r Permit2PaymentCollector
// forwards collectorData straight to permit2.permitTransferFrom, so the signature
// must be over PermitTransferFrom — a witness-typed signature reverts.
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

/** Map of address → private key for local signing. */
const addressToKey = new Map<string, `0x${string}`>(
  accounts.map((a) => [a.address.toLowerCase(), a.privateKey]),
)

/**
 * Generate Permit2 collectorData for charge()/authorize() in fork tests.
 * Mirrors createCollectorData (ERC-3009) but signs a plain Permit2
 * PermitTransferFrom. Uses local private-key signing (not Anvil RPC) for
 * correct EIP-712 signatures.
 *
 * Requires a one-time ERC20.approve(PERMIT2_ADDRESS, …) on the payer's token
 * before the signature can settle.
 */
export async function createPermit2CollectorData(
  walletClient: WalletClient,
  paymentInfo: PaymentInfo,
): Promise<{ collectorData: Hex; tokenCollector: Address }> {
  const tokenCollector = baseSepolia.collectors.permit2
  const escrowAddress = baseSepolia.authCaptureEscrow
  const payer = walletClient.account!.address

  // Resolve private key for local signing
  const privateKey = addressToKey.get(payer.toLowerCase())
  if (!privateKey) {
    throw new Error(`No private key found for address ${payer}`)
  }
  const localAccount = privateKeyToAccount(privateKey)

  // Payer-agnostic nonce (matches AuthCaptureEscrow.getHash with payer=0x0).
  // Permit2's nonce field is uint256, so coerce the bytes32 hash to bigint.
  const nonce = BigInt(
    computePaymentInfoHash(CHAIN_ID, escrowAddress, {
      ...paymentInfo,
      payer: zeroAddress,
    }),
  )

  // Sign Permit2 PermitTransferFrom (EIP-712) with local key
  const signature = await localAccount.signTypedData({
    domain: {
      name: 'Permit2',
      chainId: CHAIN_ID,
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
  })

  return { collectorData: signature, tokenCollector }
}

/**
 * Build the one-time ERC20.approve(PERMIT2, MAX) tx the payer sends so the
 * canonical Permit2 contract can pull funds. Ported from the removed
 * @x402r/core helper of the same name (its published equivalent lives in
 * @x402/evm); kept here as fork-test infra.
 */
export function createPermit2ApprovalTx(tokenAddress: Address): {
  to: Address
  data: Hex
} {
  return {
    to: getAddress(tokenAddress),
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [PERMIT2_ADDRESS, maxUint256],
    }),
  }
}

/**
 * Build readContract args for the payer's current Permit2 allowance over a
 * token. Ported from the removed @x402r/core helper of the same name.
 */
export function getPermit2AllowanceReadParams(input: {
  tokenAddress: Address
  ownerAddress: Address
}): {
  address: Address
  abi: typeof erc20Abi
  functionName: 'allowance'
  args: readonly [Address, Address]
} {
  return {
    address: getAddress(input.tokenAddress),
    abi: erc20Abi,
    functionName: 'allowance',
    args: [getAddress(input.ownerAddress), PERMIT2_ADDRESS],
  }
}
