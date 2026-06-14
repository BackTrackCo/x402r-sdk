import type { PublicClient } from 'viem'
import { erc20Abi } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import { createX402r, type X402r } from '../../../sdk/src/index.js'
import {
  createPermit2ApprovalTx,
  getPermit2AllowanceReadParams,
} from '../../src/payment/permit2.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import { DEFAULT_AMOUNT, testRoles } from '../setup/constants.js'
import type { DeployedFixtures } from '../setup/deploy-fixtures.js'
import { createPermit2CollectorData } from '../setup/permit2-helper.js'
import { setupScenario } from '../setup/scenario-helper.js'

// ---------------------------------------------------------------------------
// Scenario: Permit2 Atomic Charge (moved from examples/scenarios)
//   Routes through Uniswap Permit2 instead of EIP-3009. Two payer-side moves:
//   1. One-time ERC20.approve(PERMIT2, MAX) so canonical Permit2 can pull funds.
//   2. Per-payment PermitTransferFrom signature → collectorData + tokenCollector
//      consumed by payment.charge().
//   Asserts real ERC-20 balance deltas: payer ↓ amount, receiver Δ + fee Δ
//   === amount, fee Δ > 0.
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let fixtures: DeployedFixtures
let payerClient: X402r

let paymentInfo: PaymentInfo

beforeAll(async () => {
  ;({ publicClient, fixtures, paymentInfo } = await setupScenario({
    salt: 23n,
  }))

  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.operatorAddress,
  })
}, 60_000)

describe('Permit2 Atomic Charge', () => {
  it('approve → charge moves the full amount with correct balance deltas', async () => {
    const payerWallet = anvilBaseSepolia.getWalletClient(
      testRoles.payer.address,
    )

    const readBalance = (owner: `0x${string}`) =>
      publicClient.readContract({
        address: paymentInfo.token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [owner],
      })

    // One-time Permit2 approval (payer → canonical Permit2)
    const allowanceParams = getPermit2AllowanceReadParams({
      tokenAddress: paymentInfo.token,
      ownerAddress: paymentInfo.payer,
    })
    await publicClient.readContract(allowanceParams)

    const approvalTx = createPermit2ApprovalTx(paymentInfo.token)
    const approvalHash = await payerWallet.sendTransaction({
      ...approvalTx,
      account: testRoles.payer.address,
      chain: anvilBaseSepolia.chain,
    })
    await publicClient.waitForTransactionReceipt({ hash: approvalHash })

    // Pin the post-condition charge consumes: Permit2 covers PAYMENT_AMOUNT.
    const allowanceAfter = await publicClient.readContract(allowanceParams)
    expect(allowanceAfter).toBeGreaterThanOrEqual(DEFAULT_AMOUNT)

    // Snapshot pre-charge balances
    const payerBefore = await readBalance(paymentInfo.payer)
    const receiverBefore = await readBalance(paymentInfo.receiver)
    const feeReceiverBefore = await readBalance(paymentInfo.feeReceiver)

    // Atomic charge via the SDK viem flow — Permit2 token collector, single tx
    const { collectorData, tokenCollector } = await createPermit2CollectorData(
      payerWallet,
      paymentInfo,
    )
    const chargeHash = await payerClient.payment.charge(
      paymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash: chargeHash })

    const payerAfter = await readBalance(paymentInfo.payer)
    const receiverAfter = await readBalance(paymentInfo.receiver)
    const feeReceiverAfter = await readBalance(paymentInfo.feeReceiver)

    const payerDelta = payerBefore - payerAfter
    const receiverDelta = receiverAfter - receiverBefore
    const feeDelta = feeReceiverAfter - feeReceiverBefore

    expect(payerDelta).toBe(DEFAULT_AMOUNT)
    expect(receiverDelta + feeDelta).toBe(DEFAULT_AMOUNT)
    expect(feeDelta).toBeGreaterThan(0n)
  }, 60_000)
})
