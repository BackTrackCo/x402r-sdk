import type { Address, Hex, WalletClient } from 'viem'
import { getAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { x402rChains } from '../../src/config/index.js'
import { computeEscrowNonce } from '../../src/payment/hashing.js'
import { PERMIT2_ADDRESS } from '../../src/payment/permit2.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { accounts } from './constants.js'

const baseSepolia = x402rChains[84532]
const CHAIN_ID = 84532

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
  const nonce = BigInt(computeEscrowNonce(CHAIN_ID, escrowAddress, paymentInfo))

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
