import type { PaymentInfo } from '@x402r/core'
import { computeEscrowNonce, getChainConfig } from '@x402r/core'
import type { Address, Hex } from 'viem'
import { getAddress } from 'viem'
import type { LocalAccount } from 'viem/accounts'

/** EIP-712 typed data for ERC-3009 `receiveWithAuthorization`. */
export const RECEIVE_AUTHORIZATION_TYPES = {
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
}): Promise<{ collectorData: Hex; tokenCollector: Address }> {
  const { account, chainId, paymentInfo } = params
  const chainConfig = getChainConfig(chainId)
  const tokenCollector = chainConfig.tokenCollector
  const nonce = computeEscrowNonce(
    chainId,
    chainConfig.authCaptureEscrow,
    paymentInfo,
  )

  const signature = await account.signTypedData({
    domain: {
      name: 'USDC',
      version: '2',
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
