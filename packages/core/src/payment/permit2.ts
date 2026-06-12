import type { Address, Hex } from 'viem'
import { encodeFunctionData, erc20Abi, getAddress } from 'viem'
import type { LocalAccount } from 'viem/accounts'
import { getChainConfig } from '../config/index.js'
import type { PaymentInfo } from '../types/index.js'
import { computeEscrowNonce } from './hashing.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Canonical Uniswap Permit2 contract. Same address on every chain it's deployed
 * to — payers `approve(PERMIT2_ADDRESS, …)` once per (token, chain) and every
 * downstream Permit2 spender works thereafter.
 *
 * https://github.com/Uniswap/permit2
 */
export const PERMIT2_ADDRESS =
  '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const satisfies Address

const MAX_UINT256 =
  0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn

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

// ---------------------------------------------------------------------------
// Companion types
// ---------------------------------------------------------------------------

export type SignPermit2AuthorizationParameters = {
  account: LocalAccount
  chainId: number
  paymentInfo: PaymentInfo
  /** Override the Permit2 token collector (default: from chain config) */
  tokenCollector?: Address
  /** Override escrow address for nonce computation (default: from chain config) */
  escrowAddress?: Address
}

export type SignPermit2AuthorizationReturnType = {
  /**
   * Raw 65-byte EOA EIP-712 signature — pass directly to `payment.charge` /
   * `payment.authorize` as `collectorData`.
   *
   * WARNING: do not wrap with `encodeAbiParameters` / `abi.encode(bytes)`.
   * commerce-payments' Permit2PaymentCollector forwards `collectorData`
   * straight through `_handleERC6492Signature` to
   * `permit2.permitTransferFrom`, and Permit2 reverts with
   * `InvalidSignatureLength()` for anything that isn't 65 (EOA) or 64
   * (EIP-2098) bytes.
   */
  collectorData: Hex
  tokenCollector: Address
}

export type CreatePermit2ApprovalTxReturnType = {
  to: Address
  data: Hex
}

export type GetPermit2AllowanceReadParamsInput = {
  tokenAddress: Address
  ownerAddress: Address
}

export type GetPermit2AllowanceReadParamsReturnType = {
  address: Address
  abi: typeof erc20Abi
  functionName: 'allowance'
  args: readonly [Address, Address]
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Signs a Uniswap Permit2 `PermitTransferFrom` for the given paymentInfo.
 *
 * Parallels `signReceiveAuthorization` (ERC-3009) at the same boundary —
 * returns `{ collectorData, tokenCollector }` ready to pass to
 * `payment.charge` / `payment.authorize`.
 *
 * The nonce is the payer-agnostic PaymentInfo hash (same as ERC-3009), so the
 * facilitator can reconstruct it from PaymentInfo regardless of who pays.
 * Freshness is the responsibility of `paymentInfo.salt` — use a fresh salt
 * per signing request.
 *
 * Requires a one-time `ERC20.approve(PERMIT2_ADDRESS, MAX_UINT256)` on the
 * payer's token before this signature can settle. See `createPermit2ApprovalTx`
 * and `getPermit2AllowanceReadParams`.
 */
export async function signPermit2Authorization(
  parameters: SignPermit2AuthorizationParameters,
): Promise<SignPermit2AuthorizationReturnType> {
  const { account, chainId, paymentInfo } = parameters
  const chainConfig = getChainConfig(chainId)
  const tokenCollector = getAddress(
    parameters.tokenCollector ?? chainConfig.collectors.permit2,
  )
  const escrowAddress =
    parameters.escrowAddress ?? chainConfig.authCaptureEscrow
  const nonce = BigInt(computeEscrowNonce(chainId, escrowAddress, paymentInfo))

  const signature = await account.signTypedData({
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
      spender: tokenCollector,
      nonce,
      deadline: BigInt(paymentInfo.preApprovalExpiry),
    },
  })

  // commerce-payments' Permit2PaymentCollector passes collectorData directly
  // to `_handleERC6492Signature` and then to `permit2.permitTransferFrom` —
  // so collectorData must be the raw 65-byte EOA signature, NOT an ABI-encoded
  // wrapper. Permit2 reverts with `InvalidSignatureLength()` otherwise.
  return { collectorData: signature, tokenCollector }
}

/**
 * Build the transaction the payer sends once per (token, chain) to grant the
 * canonical Permit2 contract unlimited spending allowance over their token.
 *
 * Mirrors upstream `@x402/evm`'s helper of the same name. Use with viem's
 * `walletClient.sendTransaction(tx)` — payer pays gas. Check current allowance
 * first via `getPermit2AllowanceReadParams`.
 */
export function createPermit2ApprovalTx(
  tokenAddress: Address,
): CreatePermit2ApprovalTxReturnType {
  return {
    to: getAddress(tokenAddress),
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [PERMIT2_ADDRESS, MAX_UINT256],
    }),
  }
}

/**
 * Build `readContract` arguments for checking the payer's current Permit2
 * allowance over a given token. Returns `bigint` — compare to the required
 * payment amount to decide whether `createPermit2ApprovalTx` is needed.
 *
 * Mirrors upstream `@x402/evm`'s helper of the same name.
 */
export function getPermit2AllowanceReadParams(
  input: GetPermit2AllowanceReadParamsInput,
): GetPermit2AllowanceReadParamsReturnType {
  return {
    address: getAddress(input.tokenAddress),
    abi: erc20Abi,
    functionName: 'allowance',
    args: [getAddress(input.ownerAddress), PERMIT2_ADDRESS],
  }
}
