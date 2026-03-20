import type { Address, Hex } from 'viem'
import { getAddress } from 'viem'
import type { LocalAccount } from 'viem/accounts'
import { getChainConfig } from '../config/index.js'
import type { PaymentInfo } from '../types/index.js'
import { computeEscrowNonce } from './hashing.js'

/** EIP-712 typed data for ERC-3009 `receiveWithAuthorization`. */
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

/**
 * Signs an ERC-3009 `ReceiveWithAuthorization` for the given paymentInfo.
 *
 * Requires a local account (private key). For browser/hardware wallet signing,
 * use `@x402r/evm`'s `EscrowEvmScheme` via the x402 client flow instead.
 *
 * Encapsulates nonce derivation, EIP-712 domain construction, and signing so
 * callers don't need to hand-roll ~30 lines of protocol-specific code.
 *
 * The returned `collectorData` and `tokenCollector` can be passed directly to
 * `payment.authorize()` or `payment.charge()`.
 */
export async function signReceiveAuthorization(params: {
  account: LocalAccount
  chainId: number
  paymentInfo: PaymentInfo
  /** EIP-712 domain name of the token (default: "USDC") */
  tokenName?: string
  /** EIP-712 domain version of the token (default: "2") */
  tokenVersion?: string
  /** Override tokenCollector (default: from chain config) */
  tokenCollector?: Address
  /** Override escrow address for nonce computation (default: from chain config) */
  escrowAddress?: Address
}): Promise<{ collectorData: Hex; tokenCollector: Address }> {
  const { account, chainId, paymentInfo } = params
  const chainConfig = getChainConfig(chainId)
  const tokenCollector = params.tokenCollector ?? chainConfig.tokenCollector
  const escrowAddress = params.escrowAddress ?? chainConfig.authCaptureEscrow
  const nonce = computeEscrowNonce(chainId, escrowAddress, paymentInfo)

  const signature = await account.signTypedData({
    domain: {
      name: params.tokenName ?? 'USDC',
      version: params.tokenVersion ?? '2',
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
  })

  return { collectorData: signature, tokenCollector }
}
