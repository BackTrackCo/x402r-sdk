import type { Address, PublicClient, TestClient, WalletClient } from 'viem'
import {
  encodeAbiParameters,
  erc20Abi,
  keccak256,
  pad,
  zeroAddress,
} from 'viem'
import {
  andConditionFactoryAbi,
  escrowPeriodFactoryAbi,
  freezeFactoryAbi,
  orConditionFactoryAbi,
  paymentOperatorFactoryAbi,
  staticAddressConditionFactoryAbi,
  staticFeeCalculatorFactoryAbi,
} from '../../src/abis/generated.js'
import { x402rChains } from '../../src/config/index.js'
import { deployArbiterSetup } from '../../src/deploy/index.js'
import { accounts, testRoles } from './constants.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeployedFixtures {
  operatorAddress: Address
  feeCalculatorAddress: Address
  escrowPeriodAddress: Address
  freezeAddress: Address
  operatorWithFreezeAddress: Address
  arbiterConditionAddress: Address
  signatureConditionAddress: Address
  refundRequestAddress: Address
  arbiterRefundOperatorAddress: Address
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
const USDC_BALANCE_SLOT = 9n

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

  // 0. Clear contract code at all test accounts
  //    On Base Sepolia, standard Anvil/Hardhat addresses have contracts deployed.
  //    USDC FiatTokenV2_2 uses OZ SignatureChecker which checks signer.code.length —
  //    if code exists, it skips ecrecover and tries EIP-1271 instead, breaking ERC-3009.
  for (const account of accounts) {
    await testClient.setCode({ address: account.address, bytecode: '0x' })
  }

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

  // 3. Deploy standard PaymentOperator via factory (no freeze)
  const operatorConfig = {
    feeRecipient: testRoles.operatorFeeRecipient.address,
    feeCalculator: feeCalculatorAddress,
    authorizeCondition: zeroAddress,
    authorizeRecorder: escrowPeriodAddress,
    chargeCondition: zeroAddress,
    chargeRecorder: zeroAddress,
    releaseCondition: escrowPeriodAddress,
    releaseRecorder: zeroAddress,
    refundInEscrowCondition: zeroAddress,
    refundInEscrowRecorder: zeroAddress,
    refundPostEscrowCondition: baseSepolia.conditions.receiver,
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

  // ---------------------------------------------------------------------------
  // 3a. Deploy StaticAddressCondition(arbiter) via factory
  // ---------------------------------------------------------------------------
  const arbiterCondHash = await walletClient.writeContract({
    address: factories.staticAddressCondition,
    abi: staticAddressConditionFactoryAbi,
    functionName: 'deploy',
    args: [testRoles.arbiter.address],
    account: deployer,
    chain: walletClient.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: arbiterCondHash })

  const arbiterConditionAddress = await publicClient.readContract({
    address: factories.staticAddressCondition,
    abi: staticAddressConditionFactoryAbi,
    functionName: 'computeAddress',
    args: [testRoles.arbiter.address],
  })

  // ---------------------------------------------------------------------------
  // 3b. Deploy Freeze(arbiterCond, arbiterCond, 0, escrowPeriod) via factory
  // ---------------------------------------------------------------------------
  const freezeHash = await walletClient.writeContract({
    address: factories.freeze,
    abi: freezeFactoryAbi,
    functionName: 'deploy',
    args: [
      arbiterConditionAddress,
      arbiterConditionAddress,
      0n,
      escrowPeriodAddress,
    ],
    account: deployer,
    chain: walletClient.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: freezeHash })

  const freezeAddress = await publicClient.readContract({
    address: factories.freeze,
    abi: freezeFactoryAbi,
    functionName: 'computeAddress',
    args: [
      arbiterConditionAddress,
      arbiterConditionAddress,
      0n,
      escrowPeriodAddress,
    ],
  })

  // ---------------------------------------------------------------------------
  // 3c. Deploy AndCondition([escrowPeriod, freeze]) via factory
  // ---------------------------------------------------------------------------
  const andCondHash = await walletClient.writeContract({
    address: factories.andCondition,
    abi: andConditionFactoryAbi,
    functionName: 'deploy',
    args: [[escrowPeriodAddress, freezeAddress]],
    account: deployer,
    chain: walletClient.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: andCondHash })

  const andConditionAddress = await publicClient.readContract({
    address: factories.andCondition,
    abi: andConditionFactoryAbi,
    functionName: 'computeAddress',
    args: [[escrowPeriodAddress, freezeAddress]],
  })

  // ---------------------------------------------------------------------------
  // 3d. Deploy SignatureCondition + RefundRequest
  // ---------------------------------------------------------------------------
  const arbiterSetup = await deployArbiterSetup(walletClient, publicClient, {
    chainId: 84532,
    arbiter: testRoles.arbiter.address,
  })
  const signatureConditionAddress = arbiterSetup.signatureConditionAddress
  const refundRequestAddress = arbiterSetup.refundRequestAddress

  // Deploy StaticAddressCondition(refundRequest) — gates refundInEscrow so
  // only the RefundRequest contract can call operator.refundInEscrow().
  const refundInEscrowCondHash = await walletClient.writeContract({
    address: factories.staticAddressCondition,
    abi: staticAddressConditionFactoryAbi,
    functionName: 'deploy',
    args: [refundRequestAddress],
    account: deployer,
    chain: walletClient.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: refundInEscrowCondHash })

  const staticAddrCondAddress = await publicClient.readContract({
    address: factories.staticAddressCondition,
    abi: staticAddressConditionFactoryAbi,
    functionName: 'computeAddress',
    args: [refundRequestAddress],
  })

  // Deploy OrCondition([ReceiverCondition, StaticAddressCondition(refundRequest)])
  // This allows both merchant direct refund (ReceiverCondition arm) and
  // arbiter-approved refund via RefundRequest.approve() (StaticAddressCondition arm).
  const refundOrCondHash = await walletClient.writeContract({
    address: factories.orCondition,
    abi: orConditionFactoryAbi,
    functionName: 'deploy',
    args: [[baseSepolia.conditions.receiver, staticAddrCondAddress]],
    account: deployer,
    chain: walletClient.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: refundOrCondHash })

  const refundInEscrowOrCondAddress = await publicClient.readContract({
    address: factories.orCondition,
    abi: orConditionFactoryAbi,
    functionName: 'computeAddress',
    args: [[baseSepolia.conditions.receiver, staticAddrCondAddress]],
  })

  // ---------------------------------------------------------------------------
  // 3e. Deploy PaymentOperator with freeze
  // ---------------------------------------------------------------------------
  const freezeOperatorConfig = {
    feeRecipient: testRoles.operatorFeeRecipient.address,
    feeCalculator: feeCalculatorAddress,
    authorizeCondition: zeroAddress,
    authorizeRecorder: escrowPeriodAddress,
    chargeCondition: zeroAddress,
    chargeRecorder: zeroAddress,
    releaseCondition: andConditionAddress,
    releaseRecorder: zeroAddress,
    refundInEscrowCondition: refundInEscrowOrCondAddress,
    refundInEscrowRecorder: zeroAddress,
    refundPostEscrowCondition: zeroAddress,
    refundPostEscrowRecorder: zeroAddress,
  } as const

  const freezeOpHash = await walletClient.writeContract({
    address: factories.paymentOperator,
    abi: paymentOperatorFactoryAbi,
    functionName: 'deployOperator',
    args: [freezeOperatorConfig],
    account: deployer,
    chain: walletClient.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: freezeOpHash })

  const operatorWithFreezeAddress = await publicClient.readContract({
    address: factories.paymentOperator,
    abi: paymentOperatorFactoryAbi,
    functionName: 'computeAddress',
    args: [freezeOperatorConfig],
  })

  // ---------------------------------------------------------------------------
  // 3f. Deploy PaymentOperator for arbiter refund (Flow 7)
  //     refundInEscrowCondition = OR(ReceiverCondition, StaticAddressCondition(refundRequest))
  //     Merchant can refund directly (ReceiverCondition arm), or
  //     RefundRequest.approve() atomically calls operator.refundInEscrow() (StaticAddrCond arm)
  // ---------------------------------------------------------------------------
  const arbiterRefundOperatorConfig = {
    feeRecipient: testRoles.operatorFeeRecipient.address,
    feeCalculator: feeCalculatorAddress,
    authorizeCondition: zeroAddress,
    authorizeRecorder: escrowPeriodAddress,
    chargeCondition: zeroAddress,
    chargeRecorder: zeroAddress,
    releaseCondition: escrowPeriodAddress,
    releaseRecorder: zeroAddress,
    refundInEscrowCondition: refundInEscrowOrCondAddress,
    refundInEscrowRecorder: zeroAddress,
    refundPostEscrowCondition: baseSepolia.conditions.receiver,
    refundPostEscrowRecorder: zeroAddress,
  } as const

  const arbiterRefundOpHash = await walletClient.writeContract({
    address: factories.paymentOperator,
    abi: paymentOperatorFactoryAbi,
    functionName: 'deployOperator',
    args: [arbiterRefundOperatorConfig],
    account: deployer,
    chain: walletClient.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: arbiterRefundOpHash })

  const arbiterRefundOperatorAddress = await publicClient.readContract({
    address: factories.paymentOperator,
    abi: paymentOperatorFactoryAbi,
    functionName: 'computeAddress',
    args: [arbiterRefundOperatorConfig],
  })

  // ---------------------------------------------------------------------------
  // 4. Fund payer with USDC via storage slot manipulation
  // ---------------------------------------------------------------------------
  const payerUsdcAmount = 10_000_000_000n // 10,000 USDC (6 decimals)
  const payerSlot = getBalanceSlot(testRoles.payer.address, USDC_BALANCE_SLOT)
  await testClient.setStorageAt({
    address: USDC,
    index: payerSlot,
    value: pad(`0x${payerUsdcAmount.toString(16)}` as `0x${string}`),
  })

  const payerBalance = await publicClient.readContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [testRoles.payer.address],
  })

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
    freezeAddress,
    operatorWithFreezeAddress,
    arbiterConditionAddress,
    signatureConditionAddress,
    refundRequestAddress,
    arbiterRefundOperatorAddress,
  }
}
