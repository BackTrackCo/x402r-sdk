import type { PublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  createMerchantClient,
  createX402r,
  type MerchantClient,
  type X402r,
} from '../../../sdk/src/index.js'
import { signReceiveAuthorization } from '../../src/payment/erc3009.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import { DEFAULT_AMOUNT, testRoles } from '../setup/constants.js'
import type { DeployedFixtures } from '../setup/deploy-fixtures.js'
import { setupScenario } from '../setup/scenario-helper.js'

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let publicClient: PublicClient
let fixtures: DeployedFixtures
let payerClient: X402r
let merchant: MerchantClient

const payerAccount = privateKeyToAccount(testRoles.payer.privateKey)

let paymentInfo: Parameters<typeof signReceiveAuthorization>[0]['paymentInfo']

beforeAll(async () => {
  ;({ publicClient, fixtures, paymentInfo } = await setupScenario({
    salt: 100n,
  }))

  payerClient = createX402r({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.payer.address),
    operatorAddress: fixtures.operatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
  })

  merchant = createMerchantClient({
    publicClient,
    walletClient: anvilBaseSepolia.getWalletClient(testRoles.receiver.address),
    operatorAddress: fixtures.operatorAddress,
    escrowPeriodAddress: fixtures.escrowPeriodAddress,
  })
}, 60_000)

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('signReceiveAuthorization on-chain validation', () => {
  it('authorize succeeds with signReceiveAuthorization output', async () => {
    const { collectorData, tokenCollector } = await signReceiveAuthorization({
      account: payerAccount,
      chainId: 84532,
      paymentInfo,
    })

    const hash = await payerClient.payment.authorize(
      paymentInfo,
      DEFAULT_AMOUNT,
      tokenCollector,
      collectorData,
    )
    await publicClient.waitForTransactionReceipt({ hash })

    const amounts = await merchant.payment.getAmounts(paymentInfo)
    expect(amounts.hasCollectedPayment).toBe(true)
  }, 60_000)
})
