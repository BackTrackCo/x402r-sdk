import type { Address, Hex, PublicClient, WalletClient } from 'viem'
import {
  andConditionFactoryAbi,
  escrowPeriodFactoryAbi,
  freezeFactoryAbi,
  notConditionFactoryAbi,
  orConditionFactoryAbi,
  paymentOperatorFactoryAbi,
  recorderCombinatorFactoryAbi,
  staticAddressConditionFactoryAbi,
  staticFeeCalculatorFactoryAbi,
} from '../abis/generated.js'
import type { OperatorConfig } from '../types/index.js'
import {
  computeViaFactory,
  type DeployResult,
  deployViaFactory,
} from './factory-helpers.js'

// ---------------------------------------------------------------------------
// StaticFeeCalculator
// ---------------------------------------------------------------------------

export function computeFeeCalculatorAddress(
  publicClient: PublicClient,
  factoryAddress: Address,
  feeBps: bigint,
): Promise<Address> {
  return computeViaFactory(publicClient, {
    factoryAddress,
    abi: staticFeeCalculatorFactoryAbi,
    args: [feeBps],
  })
}

export function deployFeeCalculator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  factoryAddress: Address,
  feeBps: bigint,
): Promise<DeployResult> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress,
    abi: staticFeeCalculatorFactoryAbi,
    args: [feeBps],
    opName: 'deployFeeCalculator',
  })
}

// ---------------------------------------------------------------------------
// EscrowPeriod
// ---------------------------------------------------------------------------

export function computeEscrowPeriodAddress(
  publicClient: PublicClient,
  factoryAddress: Address,
  escrowPeriod: bigint,
  authorizedCodehash: Hex,
): Promise<Address> {
  return computeViaFactory(publicClient, {
    factoryAddress,
    abi: escrowPeriodFactoryAbi,
    args: [escrowPeriod, authorizedCodehash],
  })
}

export function deployEscrowPeriod(
  walletClient: WalletClient,
  publicClient: PublicClient,
  factoryAddress: Address,
  escrowPeriod: bigint,
  authorizedCodehash: Hex,
): Promise<DeployResult> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress,
    abi: escrowPeriodFactoryAbi,
    args: [escrowPeriod, authorizedCodehash],
    opName: 'deployEscrowPeriod',
  })
}

// ---------------------------------------------------------------------------
// Freeze
// ---------------------------------------------------------------------------

export function computeFreezeAddress(
  publicClient: PublicClient,
  factoryAddress: Address,
  freezeCondition: Address,
  unfreezeCondition: Address,
  freezeDuration: bigint,
  escrowPeriodContract: Address,
): Promise<Address> {
  return computeViaFactory(publicClient, {
    factoryAddress,
    abi: freezeFactoryAbi,
    args: [
      freezeCondition,
      unfreezeCondition,
      freezeDuration,
      escrowPeriodContract,
    ],
  })
}

export function deployFreeze(
  walletClient: WalletClient,
  publicClient: PublicClient,
  factoryAddress: Address,
  freezeCondition: Address,
  unfreezeCondition: Address,
  freezeDuration: bigint,
  escrowPeriodContract: Address,
): Promise<DeployResult> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress,
    abi: freezeFactoryAbi,
    args: [
      freezeCondition,
      unfreezeCondition,
      freezeDuration,
      escrowPeriodContract,
    ],
    opName: 'deployFreeze',
  })
}

// ---------------------------------------------------------------------------
// StaticAddressCondition
// ---------------------------------------------------------------------------

export function computeStaticAddressConditionAddress(
  publicClient: PublicClient,
  factoryAddress: Address,
  designatedAddress: Address,
): Promise<Address> {
  return computeViaFactory(publicClient, {
    factoryAddress,
    abi: staticAddressConditionFactoryAbi,
    args: [designatedAddress],
  })
}

export function deployStaticAddressCondition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  factoryAddress: Address,
  designatedAddress: Address,
): Promise<DeployResult> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress,
    abi: staticAddressConditionFactoryAbi,
    args: [designatedAddress],
    opName: 'deployStaticAddressCondition',
  })
}

// ---------------------------------------------------------------------------
// AndCondition
// ---------------------------------------------------------------------------

export function computeAndConditionAddress(
  publicClient: PublicClient,
  factoryAddress: Address,
  conditions: readonly Address[],
): Promise<Address> {
  return computeViaFactory(publicClient, {
    factoryAddress,
    abi: andConditionFactoryAbi,
    args: [conditions],
  })
}

export function deployAndCondition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  factoryAddress: Address,
  conditions: readonly Address[],
): Promise<DeployResult> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress,
    abi: andConditionFactoryAbi,
    args: [conditions],
    opName: 'deployAndCondition',
  })
}

// ---------------------------------------------------------------------------
// OrCondition
// ---------------------------------------------------------------------------

export function computeOrConditionAddress(
  publicClient: PublicClient,
  factoryAddress: Address,
  conditions: readonly Address[],
): Promise<Address> {
  return computeViaFactory(publicClient, {
    factoryAddress,
    abi: orConditionFactoryAbi,
    args: [conditions],
  })
}

export function deployOrCondition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  factoryAddress: Address,
  conditions: readonly Address[],
): Promise<DeployResult> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress,
    abi: orConditionFactoryAbi,
    args: [conditions],
    opName: 'deployOrCondition',
  })
}

// ---------------------------------------------------------------------------
// NotCondition
// ---------------------------------------------------------------------------

export function computeNotConditionAddress(
  publicClient: PublicClient,
  factoryAddress: Address,
  condition: Address,
): Promise<Address> {
  return computeViaFactory(publicClient, {
    factoryAddress,
    abi: notConditionFactoryAbi,
    args: [condition],
  })
}

export function deployNotCondition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  factoryAddress: Address,
  condition: Address,
): Promise<DeployResult> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress,
    abi: notConditionFactoryAbi,
    args: [condition],
    opName: 'deployNotCondition',
  })
}

// ---------------------------------------------------------------------------
// RecorderCombinator
// ---------------------------------------------------------------------------

export function computeRecorderCombinatorAddress(
  publicClient: PublicClient,
  factoryAddress: Address,
  recorders: readonly Address[],
): Promise<Address> {
  return computeViaFactory(publicClient, {
    factoryAddress,
    abi: recorderCombinatorFactoryAbi,
    args: [recorders],
  })
}

export function deployRecorderCombinator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  factoryAddress: Address,
  recorders: readonly Address[],
): Promise<DeployResult> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress,
    abi: recorderCombinatorFactoryAbi,
    args: [recorders],
    opName: 'deployRecorderCombinator',
  })
}

// ---------------------------------------------------------------------------
// PaymentOperator
// ---------------------------------------------------------------------------

export function computeOperatorAddress(
  publicClient: PublicClient,
  factoryAddress: Address,
  config: OperatorConfig,
): Promise<Address> {
  return computeViaFactory(publicClient, {
    factoryAddress,
    abi: paymentOperatorFactoryAbi,
    args: [config],
  })
}

export function deployOperator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  factoryAddress: Address,
  config: OperatorConfig,
): Promise<DeployResult> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress,
    abi: paymentOperatorFactoryAbi,
    args: [config],
    opName: 'deployOperator',
    functionNames: {
      deployFn: 'deployOperator',
      getDeployedFn: 'getOperator',
    },
  })
}
