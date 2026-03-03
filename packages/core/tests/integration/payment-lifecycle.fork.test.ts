import type { PublicClient, TestClient, WalletClient } from 'viem'
import { beforeAll, describe, expect, it } from 'vitest'
import { paymentOperatorAbi } from '../../src/abis/generated.js'
import { x402rChains } from '../../src/config/index.js'
import { anvilBaseSepolia } from '../setup/anvil.js'
import { testRoles } from '../setup/constants.js'
import {
  type DeployedFixtures,
  deployTestFixtures,
} from '../setup/deploy-fixtures.js'
import { erc20Abi } from '../setup/fork-abis.js'

const baseSepolia = x402rChains[84532]

describe('Fork Infrastructure', () => {
  let publicClient: PublicClient
  let walletClient: WalletClient
  let testClient: TestClient
  let fixtures: DeployedFixtures

  beforeAll(async () => {
    publicClient = anvilBaseSepolia.getPublicClient()
    walletClient = anvilBaseSepolia.getWalletClient(testRoles.deployer.address)
    testClient = anvilBaseSepolia.getTestClient()

    fixtures = await deployTestFixtures(publicClient, walletClient, testClient)
  }, 60_000)

  it('operator ESCROW() matches config escrow address', async () => {
    const escrow = await publicClient.readContract({
      address: fixtures.operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'ESCROW',
    })
    expect(escrow.toLowerCase()).toBe(
      baseSepolia.authCaptureEscrow.toLowerCase(),
    )
  })

  it('operator FEE_CALCULATOR() matches deployed fee calculator', async () => {
    const feeCalc = await publicClient.readContract({
      address: fixtures.operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'FEE_CALCULATOR',
    })
    expect(feeCalc.toLowerCase()).toBe(
      fixtures.feeCalculatorAddress.toLowerCase(),
    )
  })

  it('payer has expected USDC balance from storage slot manipulation', async () => {
    const balance = await publicClient.readContract({
      address: baseSepolia.usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
    expect(balance).toBe(10_000_000_000n) // 10,000 USDC
  })
})
