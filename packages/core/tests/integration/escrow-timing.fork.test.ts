import type { PublicClient, TestClient } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import { createX402r, type X402r } from '../../../sdk/src/index.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import {
  DEFAULT_AMOUNT,
  ESCROW_FAST_FORWARD,
  testRoles,
} from '../setup/constants.js'
import type { DeployedFixtures } from '../setup/deploy-fixtures.js'
import { createCollectorData } from '../setup/erc3009-helper.js'
import { setupScenario } from '../setup/scenario-helper.js'

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let payerClient: X402r

let paymentInfo: PaymentInfo

beforeAll(async () => {
  ;({ publicClient, testClient, fixtures, paymentInfo } = await setupScenario({
    salt: 2n,
  }))

  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.operatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
  })
}, 60_000)

// ---------------------------------------------------------------------------
// Scenario 2: Escrow period timing
// ---------------------------------------------------------------------------

describe('Scenario 2: Escrow period timing', () => {
  it('authorization time is recorded and escrow period is active', async () => {
    const { collectorData, tokenCollector } = await createCollectorData(
      anvilBaseSepolia.getWalletClient(testRoles.payer.address),
      paymentInfo,
    )
    const hash = await payerClient.payment.authorize(
      paymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const authTime = await payerClient.escrow!.getAuthorizationTime(paymentInfo)
    expect(authTime).toBeGreaterThan(0n)

    const duringEscrow = await payerClient.escrow!.isDuringEscrow(paymentInfo)
    expect(duringEscrow).toBe(true)

    const duration = await payerClient.escrow!.getDuration()
    expect(duration).toBe(604800n)
  }, 60_000)

  it('escrow period becomes inactive after fast-forward', async () => {
    // Fast-forward past escrow period
    await testClient.increaseTime({ seconds: ESCROW_FAST_FORWARD })
    await testClient.mine({ blocks: 1 })

    const duringEscrow = await payerClient.escrow!.isDuringEscrow(paymentInfo)
    expect(duringEscrow).toBe(false)
  }, 60_000)
})
