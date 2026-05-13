import {
  createPermit2ApprovalTx,
  getPermit2AllowanceReadParams,
  signPermit2Authorization,
} from '@x402r/core'
import { createWalletClient, erc20Abi, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { setup } from '../shared/anvil-setup.js'
import { PAYER_PRIVATE_KEY, PAYMENT_AMOUNT } from '../shared/constants.js'
import { StepRunner } from './runner.js'

// ---------------------------------------------------------------------------
// Scenario: Permit2 Atomic Charge
//
// Mirrors atomic-charge.ts but routes through Uniswap Permit2 instead of
// EIP-3009. Demonstrates the two payer-side moves:
//   1. One-time approval — `ERC20.approve(PERMIT2, MAX)` so the canonical
//      Permit2 contract can pull the payer's tokens for any Permit2 spender.
//   2. Per-payment signature — `signPermit2Authorization(...)` produces the
//      collectorData and tokenCollector that `payment.charge` consumes.
//
// Anvil fork starts with zero Permit2 allowance, so step 1 is mandatory.
// Asserts real ERC-20 balance deltas — not contract-guaranteed invariants.
// ---------------------------------------------------------------------------

async function main() {
  const ctx = await setup({ authorize: false })
  const runner = new StepRunner('Permit2 Atomic Charge', ctx.publicClient)

  try {
    runner.step('One-time Permit2 approval (payer → canonical Permit2)')

    const payerAccount = privateKeyToAccount(PAYER_PRIVATE_KEY)
    const payerWallet = createWalletClient({
      account: payerAccount,
      chain: baseSepolia,
      transport: http('http://127.0.0.1:8846/1'),
    })

    const approvalParams = getPermit2AllowanceReadParams({
      tokenAddress: ctx.paymentInfo.token,
      ownerAddress: ctx.paymentInfo.payer,
    })
    const before = await ctx.publicClient.readContract(approvalParams)
    runner.log(`Permit2 allowance before approval: ${before}`)

    const approvalTx = createPermit2ApprovalTx(ctx.paymentInfo.token)
    const approvalHash = await payerWallet.sendTransaction(approvalTx)
    await runner.waitForTx(approvalHash)

    const after = await ctx.publicClient.readContract(approvalParams)
    runner.assert(
      after > before,
      `Permit2 allowance increased after approval (was ${before}, now ${after})`,
    )

    runner.step('Snapshot pre-charge USDC balances')

    const readBalance = (owner: `0x${string}`) =>
      ctx.publicClient.readContract({
        address: ctx.paymentInfo.token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [owner],
      })

    const payerBefore = await readBalance(ctx.paymentInfo.payer)
    const receiverBefore = await readBalance(ctx.paymentInfo.receiver)
    const feeReceiverBefore = await readBalance(ctx.paymentInfo.feeReceiver)

    runner.step(
      'Atomic charge via payment.charge() — Permit2 token collector, single tx',
    )

    const { collectorData, tokenCollector } = await signPermit2Authorization({
      account: payerAccount,
      chainId: 84532,
      paymentInfo: ctx.paymentInfo,
    })

    const chargeTx = await ctx.merchant.payment.charge(
      ctx.paymentInfo,
      PAYMENT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await runner.waitForTx(chargeTx)

    const payerAfter = await readBalance(ctx.paymentInfo.payer)
    const receiverAfter = await readBalance(ctx.paymentInfo.receiver)
    const feeReceiverAfter = await readBalance(ctx.paymentInfo.feeReceiver)

    const payerDelta = payerBefore - payerAfter
    const receiverDelta = receiverAfter - receiverBefore
    const feeDelta = feeReceiverAfter - feeReceiverBefore

    runner.assert(
      payerDelta === PAYMENT_AMOUNT,
      `payer balance ↓ by PAYMENT_AMOUNT (${PAYMENT_AMOUNT}); actual ↓ ${payerDelta}`,
    )
    runner.assert(
      receiverDelta + feeDelta === PAYMENT_AMOUNT,
      `receiver Δ + fee Δ === PAYMENT_AMOUNT; receiver ↑ ${receiverDelta}, fee ↑ ${feeDelta}`,
    )
    runner.assert(
      feeDelta > 0n,
      `fee receiver delta strictly positive (${feeDelta})`,
    )

    runner.done()
  } finally {
    await ctx.cleanup()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
