import type { Address, Hex, PublicClient, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { signatureConditionAbi } from '../../src/abis/generated.js'
import { x402rChains } from '../../src/config/index.js'
import { computePaymentInfoHash } from '../../src/payment/hashing.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { accounts } from './constants.js'

const baseSepolia = x402rChains[84532]
const CHAIN_ID = 84532

const APPROVAL_TYPES = {
  Approval: [
    { name: 'paymentInfoHash', type: 'bytes32' },
    { name: 'amount', type: 'uint256' },
    { name: 'expiry', type: 'uint48' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const

/** Map of address → private key for local signing. */
const addressToKey = new Map<string, `0x${string}`>(
  accounts.map((a) => [a.address.toLowerCase(), a.privateKey]),
)

/**
 * Sign an arbiter refund approval for SignatureCondition.submitApproval().
 * Uses local private-key signing (not Anvil RPC) for correct EIP-712 signatures.
 */
export async function signArbiterApproval(params: {
  arbiterWallet: WalletClient
  publicClient: PublicClient
  signatureConditionAddress: Address
  paymentInfo: PaymentInfo
  amount: bigint
  expiry: number
}): Promise<{ signature: Hex; paymentInfoHash: Hex; approvalNonce: bigint }> {
  const paymentInfoHash = computePaymentInfoHash(
    CHAIN_ID,
    baseSepolia.authCaptureEscrow,
    params.paymentInfo,
  )

  // Read current approval nonce from SignatureCondition contract
  const approvalNonce = await params.publicClient.readContract({
    address: params.signatureConditionAddress,
    abi: signatureConditionAbi,
    functionName: 'approvalNonces',
    args: [paymentInfoHash],
  })

  // Resolve private key for local signing
  const arbiterAddress = params.arbiterWallet.account!.address
  const privateKey = addressToKey.get(arbiterAddress.toLowerCase())
  if (!privateKey) {
    throw new Error(`No private key found for address ${arbiterAddress}`)
  }
  const localAccount = privateKeyToAccount(privateKey)

  const signature = await localAccount.signTypedData({
    domain: {
      name: 'SignatureCondition',
      version: '1',
      chainId: CHAIN_ID,
      verifyingContract: params.signatureConditionAddress,
    },
    types: APPROVAL_TYPES,
    primaryType: 'Approval',
    message: {
      paymentInfoHash,
      amount: params.amount,
      expiry: params.expiry,
      nonce: approvalNonce,
    },
  })

  return { signature, paymentInfoHash, approvalNonce }
}
