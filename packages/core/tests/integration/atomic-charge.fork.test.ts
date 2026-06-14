import type { PublicClient } from 'viem'
import { erc20Abi } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import { createX402r, type X402r } from '../../../sdk/src/index.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import { DEFAULT_AMOUNT, testRoles } from '../setup/constants.js'
import type { DeployedFixtures } from '../setup/deploy-fixtures.js'
import { createCollectorData } from '../setup/erc3009-helper.js'
import { setupScenario } from '../setup/scenario-helper.js'

// ---------------------------------------------------------------------------
// Scenario: Atomic Charge (moved from examples/scenarios)
//   charge — single tx, no escrow hold, no separate capture
//   Asserts real ERC-20 balance deltas: payer ↓ amount, receiver Δ + fee Δ
//   === amount, fee Δ > 0.
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let fixtures: DeployedFixtures
let payerClient: X402r

let paymentInfo: PaymentInfo

beforeAll(async () => {
  ;({ publicClient, fixtures, paymentInfo } = await setupScenario({
    salt: 21n,
  }))

  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.operatorAddress,
  })
}, 60_000)

describe('Atomic Charge', () => {
  it('charge moves the full amount with correct balance deltas', async () => {
    const readBalance = (owner: `0x${string}`) =>
      publicClient.readContract({
        address: paymentInfo.token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [owner],
      })

    const payerBefore = await readBalance(paymentInfo.payer)
    const receiverBefore = await readBalance(paymentInfo.receiver)
    const feeReceiverBefore = await readBalance(paymentInfo.feeReceiver)

    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
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
