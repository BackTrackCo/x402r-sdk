import {
  computePaymentInfoHash,
  getChainConfig,
  type PaymentInfo,
} from '@x402r/core'
import { type Address, getAddress, type Hex, zeroAddress } from 'viem'
import type { LocalAccount } from 'viem/accounts'

// ---------------------------------------------------------------------------
// TEMPORARY shim — tracked for removal in the examples restructure (#202).
//
// The published `signReceiveAuthorization` was removed from @x402r/core: payer
// signing now lives in @x402/evm's auth-capture client. But that official client
// emits an HTTP-wire payload, not the bare { collectorData, tokenCollector } that
// these direct-contract authorize()/charge() examples pass to the SDK actions —
// and reconstructing the matching PaymentInfo needs the payer reconstruction
// helper that isn't built yet. Until #202 migrates these examples onto the
// official client + that helper, this local ERC-3009 signer keeps them runnable.
//
// DO NOT promote this to a published package — it is example scaffolding only.
// ---------------------------------------------------------------------------

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
 * Signs an ERC-3009 `ReceiveWithAuthorization` for the given paymentInfo,
 * returning `{ collectorData, tokenCollector }` ready for `payment.authorize()`
 * / `payment.charge()`. Drop-in for the removed `@x402r/core` export.
 */
export async function signReceiveAuthorization(params: {
  account: LocalAccount
  chainId: number
  paymentInfo: PaymentInfo
}): Promise<{ collectorData: Hex; tokenCollector: Address }> {
  const { account, chainId, paymentInfo } = params
  const chainConfig = getChainConfig(chainId)
  const tokenCollector = chainConfig.collectors.eip3009
  const escrowAddress = chainConfig.authCaptureEscrow

  // Payer-agnostic nonce (matches AuthCaptureEscrow.getHash with payer=0x0).
  const nonce = computePaymentInfoHash(chainId, escrowAddress, {
    ...paymentInfo,
    payer: zeroAddress,
  })

  const collectorData = await account.signTypedData({
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

  return { collectorData, tokenCollector }
}
