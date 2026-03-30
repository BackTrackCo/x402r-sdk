import type { Address, PublicClient, TestClient } from 'viem'
import { x402rChains } from '../../src/config/index.js'
import type { PaymentInfo } from '../../src/types/index.js'
import { anvilBaseSepolia } from './anvil.js'
import { DEFAULT_AMOUNT, FAR_FUTURE, testRoles } from './constants.js'
import { type DeployedFixtures, deployTestFixtures } from './deploy-fixtures.js'

const baseSepolia = x402rChains[84532]
const USDC = baseSepolia.usdc

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScenarioFixtures {
  publicClient: PublicClient
  testClient: TestClient
  fixtures: DeployedFixtures
  escrowPeriodAddress: Address
  paymentInfo: PaymentInfo
}

export type OperatorType =
  | 'standard'
  | 'freeze'
  | 'arbiterRefund'
  | 'deliveryProtection'

export interface ScenarioOptions {
  salt: bigint
  operator?: OperatorType
  amount?: bigint
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export async function setupScenario(
  opts: ScenarioOptions,
): Promise<ScenarioFixtures> {
  const publicClient = anvilBaseSepolia.getPublicClient()
  const testClient = anvilBaseSepolia.getTestClient()
  const deployerWallet = anvilBaseSepolia.getWalletClient(
    testRoles.deployer.address,
  )

  const fixtures = await deployTestFixtures(
    publicClient,
    deployerWallet,
    testClient,
  )

  const operatorAddress: Address =
    opts.operator === 'freeze'
      ? fixtures.operatorWithFreezeAddress
      : opts.operator === 'arbiterRefund'
        ? fixtures.arbiterRefundOperatorAddress
        : opts.operator === 'deliveryProtection'
          ? fixtures.deliveryProtectionOperatorAddress
          : fixtures.operatorAddress

  const escrowPeriodAddress: Address =
    opts.operator === 'deliveryProtection'
      ? fixtures.deliveryProtectionEscrowPeriodAddress
      : fixtures.escrowPeriodAddress

  const paymentInfo: PaymentInfo = {
    operator: operatorAddress,
    payer: testRoles.payer.address,
    receiver: testRoles.receiver.address,
    token: USDC,
    maxAmount: opts.amount ?? DEFAULT_AMOUNT,
    preApprovalExpiry: FAR_FUTURE,
    authorizationExpiry: FAR_FUTURE,
    refundExpiry: FAR_FUTURE,
    minFeeBps: 0,
    maxFeeBps: 500,
    feeReceiver: operatorAddress,
    salt: opts.salt,
  }

  return {
    publicClient,
    testClient,
    fixtures,
    escrowPeriodAddress,
    paymentInfo,
  }
}
