import type { PublicClient, TestClient } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import { createX402r, type X402r } from '../../../sdk/src/index.js'
import { x402rChains } from '../../src/config/index.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import { testRoles } from '../setup/constants.js'
import {
  type DeployedFixtures,
  deployTestFixtures,
} from '../setup/deploy-fixtures.js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const baseSepolia = x402rChains[84532]
const USDC = baseSepolia.usdc
const FAR_FUTURE = 281474976710655

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let testClient: TestClient
let fixtures: DeployedFixtures
let payerClient: X402r

const AMOUNT = 1_000_000n

let paymentInfo: PaymentInfo

beforeAll(async () => {
  publicClient = anvilBaseSepolia.getPublicClient()
  testClient = anvilBaseSepolia.getTestClient()
  const deployerWallet = anvilBaseSepolia.getWalletClient(
    testRoles.deployer.address,
  )

  fixtures = await deployTestFixtures(publicClient, deployerWallet, testClient)

  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.operatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
    tokenCollector: fixtures.preApprovalCollectorAddress,
  })

  paymentInfo = {
    operator: fixtures.operatorAddress,
    payer: testRoles.payer.address,
    receiver: testRoles.receiver.address,
    token: USDC,
    maxAmount: AMOUNT,
    preApprovalExpiry: FAR_FUTURE,
    authorizationExpiry: FAR_FUTURE,
    refundExpiry: FAR_FUTURE,
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: fixtures.operatorAddress,
    salt: 2n,
  }
}, 60_000)

// ---------------------------------------------------------------------------
// Scenario 2: Escrow period timing
// ---------------------------------------------------------------------------

describe('Scenario 2: Escrow period timing', () => {
  it('authorization time is recorded and escrow period is active', async () => {
    const hash = await payerClient.payment.approveAndAuthorize(
      paymentInfo,
      AMOUNT,
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
    await testClient.increaseTime({ seconds: 604801 })
    await testClient.mine({ blocks: 1 })

    const duringEscrow = await payerClient.escrow!.isDuringEscrow(paymentInfo)
    expect(duringEscrow).toBe(false)
  }, 60_000)
})
