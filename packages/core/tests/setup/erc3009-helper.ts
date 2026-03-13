import type { Address, Hex, WalletClient } from 'viem'
import { getAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { x402rChains } from '../../src/config/index.js'
import { computeEscrowNonce } from '../../src/payment/hashing.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { accounts } from './constants.js'

const baseSepolia = x402rChains[84532]
const CHAIN_ID = 84532

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

/** Map of address → private key for local signing. */
const addressToKey = new Map<string, `0x${string}`>(
  accounts.map((a) => [a.address.toLowerCase(), a.privateKey]),
)

/**
 * Generate ERC-3009 collectorData for authorize()/charge() in fork tests.
 * Uses local private-key signing (not Anvil RPC) for correct EIP-712 signatures.
 */
export async function createCollectorData(
  walletClient: WalletClient,
  paymentInfo: PaymentInfo,
): Promise<{ collectorData: Hex; tokenCollector: Address }> {
  const tokenCollector = baseSepolia.tokenCollector
  const escrowAddress = baseSepolia.authCaptureEscrow
  const payer = walletClient.account!.address

  // Resolve private key for local signing
  const privateKey = addressToKey.get(payer.toLowerCase())
  if (!privateKey) {
    throw new Error(`No private key found for address ${payer}`)
  }
  const localAccount = privateKeyToAccount(privateKey)

  // Compute nonce (matches AuthCaptureEscrow.getHash with payer=0x0)
  const nonce = computeEscrowNonce(CHAIN_ID, escrowAddress, paymentInfo)

  // Sign ERC-3009 ReceiveWithAuthorization (EIP-712) with local key
  const signature = await localAccount.signTypedData({
    domain: {
      name: 'USDC',
      version: '2',
      chainId: CHAIN_ID,
      verifyingContract: getAddress(paymentInfo.token),
    },
    types: RECEIVE_AUTHORIZATION_TYPES,
    primaryType: 'ReceiveWithAuthorization',
    message: {
      from: getAddress(payer),
      to: getAddress(tokenCollector),
      value: paymentInfo.maxAmount,
      validAfter: 0n,
      validBefore: BigInt(paymentInfo.preApprovalExpiry),
      nonce,
    },
  })

  return { collectorData: signature, tokenCollector }
}
