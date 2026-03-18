import { computeEscrowNonce, getChainConfig } from '@x402r/core'
import { getAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { setup } from '../shared/anvil-setup.js'

const ctx = await setup()

try {
  // ============ Example: Charge Payment ============
  // As a merchant, charge an authorized payment during the escrow period.
  // Requires ERC-3009 collector data for the token transfer.

  const chainConfig = getChainConfig(84532)

  // Build ERC-3009 signature for charge (same as authorize — merchant collects funds)
  const payerKey =
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const
  const localAccount = privateKeyToAccount(payerKey)
  const nonce = computeEscrowNonce(
    84532,
    chainConfig.authCaptureEscrow,
    ctx.paymentInfo,
  )
  const signature = await localAccount.signTypedData({
    domain: {
      name: 'USDC',
      version: '2',
      chainId: 84532,
      verifyingContract: getAddress(ctx.paymentInfo.token),
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
      from: getAddress(localAccount.address),
      to: getAddress(chainConfig.tokenCollector),
      value: ctx.paymentInfo.maxAmount,
      validAfter: 0n,
      validBefore: BigInt(ctx.paymentInfo.preApprovalExpiry),
      nonce,
    },
  })

  const tx = await ctx.merchant.payment.charge(
    ctx.paymentInfo,
    ctx.PAYMENT_AMOUNT,
    chainConfig.tokenCollector,
    signature,
  )
  console.log(`Payment charged: ${tx}`)

  // Verify amounts — after charge, payment has been collected
  const amounts = await ctx.merchant.payment.getAmounts(ctx.paymentInfo)
  console.log(`Has collected payment: ${amounts.hasCollectedPayment}`)
  console.log(`Capturable amount: ${amounts.capturableAmount}`)
  console.log(`Refundable amount: ${amounts.refundableAmount}`)

  if (!amounts.hasCollectedPayment) {
    throw new Error('Payment should be collected after charge')
  }
  console.log('Charge verified')
} finally {
  await ctx.cleanup()
}
