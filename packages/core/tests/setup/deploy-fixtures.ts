import type { Address, PublicClient, TestClient, WalletClient } from 'viem'
import {
  encodeAbiParameters,
  erc20Abi,
  getContractAddress,
  keccak256,
  pad,
  zeroAddress,
} from 'viem'
import {
  andConditionFactoryAbi,
  escrowPeriodFactoryAbi,
  freezeFactoryAbi,
  paymentOperatorFactoryAbi,
  signatureConditionAbi,
  signatureRefundRequestAbi,
  staticAddressConditionFactoryAbi,
  staticFeeCalculatorFactoryAbi,
} from '../../src/abis/generated.js'
import { x402rChains } from '../../src/config/index.js'
import {
  preApprovalPaymentCollectorBytecode,
  signatureConditionBytecode,
  signatureRefundRequestBytecode,
} from './bytecodes.js'
import { testRoles } from './constants.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeployedFixtures {
  operatorAddress: Address
  feeCalculatorAddress: Address
  escrowPeriodAddress: Address
  preApprovalCollectorAddress: Address
  freezeAddress: Address
  operatorWithFreezeAddress: Address
  arbiterConditionAddress: Address
  signatureConditionAddress: Address
  signatureRefundRequestAddress: Address
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

  // 3. Deploy standard PaymentOperator via factory (no freeze)
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

  // ---------------------------------------------------------------------------
  // 2b. Deploy PreApprovalPaymentCollector(authCaptureEscrow) — direct deploy
  // ---------------------------------------------------------------------------
  const preApprovalAbi = [
    {
      type: 'constructor',
      inputs: [{ name: 'authCaptureEscrow_', type: 'address' }],
      stateMutability: 'nonpayable',
    },
  ] as const

  const preApprovalNonce = await publicClient.getTransactionCount({
    address: deployer,
  })
  const preApprovalCollectorAddress = getContractAddress({
    from: deployer,
    nonce: BigInt(preApprovalNonce),
  })

  const preApprovalHash = await walletClient.deployContract({
    abi: preApprovalAbi,
    bytecode: preApprovalPaymentCollectorBytecode,
    args: [baseSepolia.authCaptureEscrow],
    account: deployer,
    chain: walletClient.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: preApprovalHash })

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
      0n, // freezeDuration = 0 → permanent
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
  // 3d. Deploy PaymentOperator with freeze (release uses AndCondition,
  //     refundInEscrow uses ReceiverCondition)
  // ---------------------------------------------------------------------------
  const freezeOperatorConfig = {
    feeRecipient: testRoles.operatorFeeRecipient.address,
    feeCalculator: feeCalculatorAddress,
    authorizeCondition: zeroAddress,
    authorizeRecorder: escrowPeriodAddress,
    chargeCondition: zeroAddress,
    chargeRecorder: zeroAddress,
    releaseCondition: andConditionAddress, // EscrowPeriod AND Freeze
    releaseRecorder: zeroAddress,
    refundInEscrowCondition: baseSepolia.conditions.receiver, // Only receiver can refund
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
  // 3e. Deploy SignatureCondition(arbiter) — direct deploy from bytecode
  // ---------------------------------------------------------------------------
  const sigCondNonce = await publicClient.getTransactionCount({
    address: deployer,
  })
  const signatureConditionAddress = getContractAddress({
    from: deployer,
    nonce: BigInt(sigCondNonce),
  })

  const sigCondHash = await walletClient.deployContract({
    abi: signatureConditionAbi,
    bytecode: signatureConditionBytecode,
    args: [testRoles.arbiter.address],
    account: deployer,
    chain: walletClient.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: sigCondHash })

  // ---------------------------------------------------------------------------
  // 3f. Deploy SignatureRefundRequest(signatureCondition) — direct deploy
  // ---------------------------------------------------------------------------
  const sigRefundNonce = await publicClient.getTransactionCount({
    address: deployer,
  })
  const signatureRefundRequestAddress = getContractAddress({
    from: deployer,
    nonce: BigInt(sigRefundNonce),
  })

  const sigRefundHash = await walletClient.deployContract({
    abi: signatureRefundRequestAbi,
    bytecode: signatureRefundRequestBytecode,
    args: [signatureConditionAddress],
    account: deployer,
    chain: walletClient.chain,
  })
  await publicClient.waitForTransactionReceipt({ hash: sigRefundHash })

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
    preApprovalCollectorAddress,
    freezeAddress,
    operatorWithFreezeAddress,
    arbiterConditionAddress,
    signatureConditionAddress,
    signatureRefundRequestAddress,
  }
}
