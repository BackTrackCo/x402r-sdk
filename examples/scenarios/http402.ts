import {
  computeEscrowNonce,
  getChainConfig,
  type PaymentInfo,
} from '@x402r/core'
import type { Address, Hex } from 'viem'
import { getAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaymentRequirements {
  operator: Address
  token: Address
  maxAmount: bigint
  receiver: Address
  feeReceiver: Address
  minFeeBps: number
  maxFeeBps: number
  preApprovalExpiry: number
  authorizationExpiry: number
  refundExpiry: number
}

export interface HTTP402PaymentResult {
  paymentInfo: PaymentInfo
}

// ---------------------------------------------------------------------------
// In-process HTTP 402 flow
// ---------------------------------------------------------------------------

export function buildPaymentRequirements(
  operatorAddress: Address,
  receiver: Address,
  chainId: number,
  amount: bigint,
): PaymentRequirements {
  const chainConfig = getChainConfig(chainId)

  return {
    operator: operatorAddress,
    token: chainConfig.usdc,
    maxAmount: amount,
    receiver,
    feeReceiver: operatorAddress,
    minFeeBps: 0,
    maxFeeBps: 500,
    preApprovalExpiry: 281_474_976_710_655,
    authorizationExpiry: 281_474_976_710_655,
    refundExpiry: 281_474_976_710_655,
  }
}

export async function performHTTP402Payment(options: {
  requirements: PaymentRequirements
  payerAddress: Address
  payerPrivateKey: `0x${string}`
  merchantClient: {
    payment: {
      authorize: (
        pi: PaymentInfo,
        amount: bigint,
        tc: Address,
        cd: Hex,
      ) => Promise<Hex>
    }
  }
  chainId: number
  salt: bigint
}): Promise<HTTP402PaymentResult> {
  const {
    requirements,
    payerAddress,
    payerPrivateKey,
    merchantClient,
    chainId,
    salt,
  } = options

  const chainConfig = getChainConfig(chainId)

  const paymentInfo: PaymentInfo = {
    operator: requirements.operator,
    payer: payerAddress,
    receiver: requirements.receiver,
    token: requirements.token,
    maxAmount: requirements.maxAmount,
    preApprovalExpiry: requirements.preApprovalExpiry,
    authorizationExpiry: requirements.authorizationExpiry,
    refundExpiry: requirements.refundExpiry,
    minFeeBps: requirements.minFeeBps,
    maxFeeBps: requirements.maxFeeBps,
    feeReceiver: requirements.feeReceiver,
    salt,
  }

  // Generate ERC-3009 signature
  const localAccount = privateKeyToAccount(payerPrivateKey)
  const nonce = computeEscrowNonce(
    chainId,
    chainConfig.authCaptureEscrow,
    paymentInfo,
  )

  const signature = await localAccount.signTypedData({
    domain: {
      name: 'USDC',
      version: '2',
      chainId,
      verifyingContract: getAddress(paymentInfo.token),
    },
    types: {
      ReceiveWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'ReceiveWithAuthorization',
    message: {
      from: getAddress(payerAddress),
      to: getAddress(chainConfig.tokenCollector),
      value: paymentInfo.maxAmount,
      validAfter: 0n,
      validBefore: BigInt(paymentInfo.preApprovalExpiry),
      nonce,
    },
  })

  // Merchant authorizes (simulates server-side 402 flow)
  await merchantClient.payment.authorize(
    paymentInfo,
    requirements.maxAmount,
    chainConfig.tokenCollector,
    signature,
  )

  return { paymentInfo }
}
