import type { Address, PublicClient, TestClient, WalletClient } from 'viem'
import {
  encodeAbiParameters,
  erc20Abi,
  keccak256,
  pad,
  zeroAddress,
} from 'viem'
import {
  escrowPeriodFactoryAbi,
  paymentOperatorFactoryAbi,
  staticFeeCalculatorFactoryAbi,
} from '../../src/abis/generated.js'
import { x402rChains } from '../../src/config/index.js'
import { testRoles } from './constants.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeployedFixtures {
  operatorAddress: Address
  feeCalculatorAddress: Address
  escrowPeriodAddress: Address
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const baseSepolia = x402rChains[84532]
const factories = baseSepolia.factories!
const USDC = baseSepolia.usdc

const FEE_BPS = 50n
const ESCROW_PERIOD_SECONDS = 604800n // 7 days

// USDC (proxy) balanceOf mapping is at storage slot 9
// See: https://eips.ethereum.org/EIPS/eip-1967 — USDC uses FiatTokenV2_2
const USDC_BALANCE_SLOT = 9n

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Computes the storage slot for `balanceOf[account]` in a standard ERC-20
 * mapping at `baseSlot`. Solidity mapping: `keccak256(abi.encode(key, slot))`
 */
function getBalanceSlot(account: Address, baseSlot: bigint): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'address' }, { type: 'uint256' }],
      [account, baseSlot],
    ),
  )
}

// ---------------------------------------------------------------------------
// Deploy
// ---------------------------------------------------------------------------

export async function deployTestFixtures(
  publicClient: PublicClient,
  walletClient: WalletClient,
  testClient: TestClient,
): Promise<DeployedFixtures> {
  const deployer = testRoles.deployer.address

  // 1. Deploy StaticFeeCalculator via factory
  const feeCalcHash = await walletClient.writeContract({
    address: factories.staticFeeCalculator,
    abi: staticFeeCalculatorFactoryAbi,
    functionName: 'deploy',
    args: [FEE_BPS],
    account: deployer,
    chain: walletClient.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: feeCalcHash })

  const feeCalculatorAddress = await publicClient.readContract({
    address: factories.staticFeeCalculator,
    abi: staticFeeCalculatorFactoryAbi,
    functionName: 'computeAddress',
    args: [FEE_BPS],
  })

  // 2. Deploy EscrowPeriod via factory
  const escrowHash = await walletClient.writeContract({
    address: factories.escrowPeriod,
    abi: escrowPeriodFactoryAbi,
    functionName: 'deploy',
    args: [ESCROW_PERIOD_SECONDS, pad('0x00')],
    account: deployer,
    chain: walletClient.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: escrowHash })

  const escrowPeriodAddress = await publicClient.readContract({
    address: factories.escrowPeriod,
    abi: escrowPeriodFactoryAbi,
    functionName: 'computeAddress',
    args: [ESCROW_PERIOD_SECONDS, pad('0x00')],
  })

  // 3. Deploy PaymentOperator via factory
  const operatorConfig = {
    feeRecipient: testRoles.operatorFeeRecipient.address,
    feeCalculator: feeCalculatorAddress,
    authorizeCondition: zeroAddress,
    authorizeRecorder: escrowPeriodAddress, // EscrowPeriod as authorize recorder
    chargeCondition: zeroAddress,
    chargeRecorder: zeroAddress,
    releaseCondition: escrowPeriodAddress, // EscrowPeriod as release condition
    releaseRecorder: zeroAddress,
    refundInEscrowCondition: zeroAddress,
    refundInEscrowRecorder: zeroAddress,
    refundPostEscrowCondition: zeroAddress,
    refundPostEscrowRecorder: zeroAddress,
  } as const

  const operatorHash = await walletClient.writeContract({
    address: factories.paymentOperator,
    abi: paymentOperatorFactoryAbi,
    functionName: 'deployOperator',
    args: [operatorConfig],
    account: deployer,
    chain: walletClient.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: operatorHash })

  const operatorAddress = await publicClient.readContract({
    address: factories.paymentOperator,
    abi: paymentOperatorFactoryAbi,
    functionName: 'computeAddress',
    args: [operatorConfig],
  })

  // 4. Fund payer with USDC via storage slot manipulation
  const payerUsdcAmount = 10_000_000_000n // 10,000 USDC (6 decimals)
  const payerSlot = getBalanceSlot(testRoles.payer.address, USDC_BALANCE_SLOT)
  await testClient.setStorageAt({
    address: USDC,
    index: payerSlot,
    value: pad(`0x${payerUsdcAmount.toString(16)}` as `0x${string}`),
  })

  // Verify USDC was funded
  const payerBalance = await publicClient.readContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [testRoles.payer.address],
  })

  // If direct slot didn't work, the USDC proxy might use a different slot layout.
  // Try slot 0 as fallback (some USDC implementations use slot 0 for balances).
  if (payerBalance === 0n) {
    const fallbackSlot = getBalanceSlot(testRoles.payer.address, 0n)
    await testClient.setStorageAt({
      address: USDC,
      index: fallbackSlot,
      value: pad(`0x${payerUsdcAmount.toString(16)}` as `0x${string}`),
    })

    const retryBalance = await publicClient.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [testRoles.payer.address],
    })
    if (retryBalance === 0n) {
      throw new Error(
        'Failed to fund payer — USDC storage slot unknown (tried slots 9 and 0)',
      )
    }
  }

  return {
    operatorAddress,
    feeCalculatorAddress,
    escrowPeriodAddress,
  }
}
