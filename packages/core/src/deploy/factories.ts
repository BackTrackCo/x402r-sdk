import type { Address, Hex, PublicClient, WalletClient } from 'viem'
import {
  andConditionFactoryAbi,
  escrowPeriodFactoryAbi,
  freezeFactoryAbi,
  notConditionFactoryAbi,
  orConditionFactoryAbi,
  paymentOperatorFactoryAbi,
  recorderCombinatorFactoryAbi,
  refundRequestFactoryAbi,
  signatureConditionFactoryAbi,
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

export interface ComputeFeeCalculatorAddressParameters {
  factoryAddress: Address
  feeBps: bigint
}
export type ComputeFeeCalculatorAddressReturnType = Address

export function computeFeeCalculatorAddress(
  publicClient: PublicClient,
  parameters: ComputeFeeCalculatorAddressParameters,
): Promise<ComputeFeeCalculatorAddressReturnType> {
  return computeViaFactory(publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: staticFeeCalculatorFactoryAbi,
    args: [parameters.feeBps],
  })
}

export interface DeployFeeCalculatorParameters {
  factoryAddress: Address
  feeBps: bigint
}
export type DeployFeeCalculatorReturnType = DeployResult

export function deployFeeCalculator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  parameters: DeployFeeCalculatorParameters,
): Promise<DeployFeeCalculatorReturnType> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: staticFeeCalculatorFactoryAbi,
    args: [parameters.feeBps],
    opName: 'deployFeeCalculator',
  })
}

// ---------------------------------------------------------------------------
// EscrowPeriod
// ---------------------------------------------------------------------------

export interface ComputeEscrowPeriodAddressParameters {
  factoryAddress: Address
  escrowPeriod: bigint
  authorizedCodehash: Hex
}
export type ComputeEscrowPeriodAddressReturnType = Address

export function computeEscrowPeriodAddress(
  publicClient: PublicClient,
  parameters: ComputeEscrowPeriodAddressParameters,
): Promise<ComputeEscrowPeriodAddressReturnType> {
  return computeViaFactory(publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: escrowPeriodFactoryAbi,
    args: [parameters.escrowPeriod, parameters.authorizedCodehash],
  })
}

export interface DeployEscrowPeriodParameters {
  factoryAddress: Address
  escrowPeriod: bigint
  authorizedCodehash: Hex
}
export type DeployEscrowPeriodReturnType = DeployResult

export function deployEscrowPeriod(
  walletClient: WalletClient,
  publicClient: PublicClient,
  parameters: DeployEscrowPeriodParameters,
): Promise<DeployEscrowPeriodReturnType> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: escrowPeriodFactoryAbi,
    args: [parameters.escrowPeriod, parameters.authorizedCodehash],
    opName: 'deployEscrowPeriod',
  })
}

// ---------------------------------------------------------------------------
// Freeze
// ---------------------------------------------------------------------------

export interface ComputeFreezeAddressParameters {
  factoryAddress: Address
  freezeCondition: Address
  unfreezeCondition: Address
  freezeDuration: bigint
  escrowPeriodContract: Address
}
export type ComputeFreezeAddressReturnType = Address

export function computeFreezeAddress(
  publicClient: PublicClient,
  parameters: ComputeFreezeAddressParameters,
): Promise<ComputeFreezeAddressReturnType> {
  return computeViaFactory(publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: freezeFactoryAbi,
    args: [
      parameters.freezeCondition,
      parameters.unfreezeCondition,
      parameters.freezeDuration,
      parameters.escrowPeriodContract,
    ],
  })
}

export interface DeployFreezeParameters {
  factoryAddress: Address
  freezeCondition: Address
  unfreezeCondition: Address
  freezeDuration: bigint
  escrowPeriodContract: Address
}
export type DeployFreezeReturnType = DeployResult

export function deployFreeze(
  walletClient: WalletClient,
  publicClient: PublicClient,
  parameters: DeployFreezeParameters,
): Promise<DeployFreezeReturnType> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: freezeFactoryAbi,
    args: [
      parameters.freezeCondition,
      parameters.unfreezeCondition,
      parameters.freezeDuration,
      parameters.escrowPeriodContract,
    ],
    opName: 'deployFreeze',
  })
}

// ---------------------------------------------------------------------------
// StaticAddressCondition
// ---------------------------------------------------------------------------

export interface ComputeStaticAddressConditionAddressParameters {
  factoryAddress: Address
  designatedAddress: Address
}
export type ComputeStaticAddressConditionAddressReturnType = Address

export function computeStaticAddressConditionAddress(
  publicClient: PublicClient,
  parameters: ComputeStaticAddressConditionAddressParameters,
): Promise<ComputeStaticAddressConditionAddressReturnType> {
  return computeViaFactory(publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: staticAddressConditionFactoryAbi,
    args: [parameters.designatedAddress],
  })
}

export interface DeployStaticAddressConditionParameters {
  factoryAddress: Address
  designatedAddress: Address
}
export type DeployStaticAddressConditionReturnType = DeployResult

export function deployStaticAddressCondition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  parameters: DeployStaticAddressConditionParameters,
): Promise<DeployStaticAddressConditionReturnType> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: staticAddressConditionFactoryAbi,
    args: [parameters.designatedAddress],
    opName: 'deployStaticAddressCondition',
  })
}

// ---------------------------------------------------------------------------
// AndCondition
// ---------------------------------------------------------------------------

export interface ComputeAndConditionAddressParameters {
  factoryAddress: Address
  conditions: readonly Address[]
}
export type ComputeAndConditionAddressReturnType = Address

export function computeAndConditionAddress(
  publicClient: PublicClient,
  parameters: ComputeAndConditionAddressParameters,
): Promise<ComputeAndConditionAddressReturnType> {
  return computeViaFactory(publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: andConditionFactoryAbi,
    args: [parameters.conditions],
  })
}

export interface DeployAndConditionParameters {
  factoryAddress: Address
  conditions: readonly Address[]
}
export type DeployAndConditionReturnType = DeployResult

export function deployAndCondition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  parameters: DeployAndConditionParameters,
): Promise<DeployAndConditionReturnType> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: andConditionFactoryAbi,
    args: [parameters.conditions],
    opName: 'deployAndCondition',
  })
}

// ---------------------------------------------------------------------------
// OrCondition
// ---------------------------------------------------------------------------

export interface ComputeOrConditionAddressParameters {
  factoryAddress: Address
  conditions: readonly Address[]
}
export type ComputeOrConditionAddressReturnType = Address

export function computeOrConditionAddress(
  publicClient: PublicClient,
  parameters: ComputeOrConditionAddressParameters,
): Promise<ComputeOrConditionAddressReturnType> {
  return computeViaFactory(publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: orConditionFactoryAbi,
    args: [parameters.conditions],
  })
}

export interface DeployOrConditionParameters {
  factoryAddress: Address
  conditions: readonly Address[]
}
export type DeployOrConditionReturnType = DeployResult

export function deployOrCondition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  parameters: DeployOrConditionParameters,
): Promise<DeployOrConditionReturnType> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: orConditionFactoryAbi,
    args: [parameters.conditions],
    opName: 'deployOrCondition',
  })
}

// ---------------------------------------------------------------------------
// NotCondition
// ---------------------------------------------------------------------------

export interface ComputeNotConditionAddressParameters {
  factoryAddress: Address
  condition: Address
}
export type ComputeNotConditionAddressReturnType = Address

export function computeNotConditionAddress(
  publicClient: PublicClient,
  parameters: ComputeNotConditionAddressParameters,
): Promise<ComputeNotConditionAddressReturnType> {
  return computeViaFactory(publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: notConditionFactoryAbi,
    args: [parameters.condition],
  })
}

export interface DeployNotConditionParameters {
  factoryAddress: Address
  condition: Address
}
export type DeployNotConditionReturnType = DeployResult

export function deployNotCondition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  parameters: DeployNotConditionParameters,
): Promise<DeployNotConditionReturnType> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: notConditionFactoryAbi,
    args: [parameters.condition],
    opName: 'deployNotCondition',
  })
}

// ---------------------------------------------------------------------------
// RecorderCombinator
// ---------------------------------------------------------------------------

export interface ComputeRecorderCombinatorAddressParameters {
  factoryAddress: Address
  recorders: readonly Address[]
}
export type ComputeRecorderCombinatorAddressReturnType = Address

export function computeRecorderCombinatorAddress(
  publicClient: PublicClient,
  parameters: ComputeRecorderCombinatorAddressParameters,
): Promise<ComputeRecorderCombinatorAddressReturnType> {
  return computeViaFactory(publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: recorderCombinatorFactoryAbi,
    args: [parameters.recorders],
  })
}

export interface DeployRecorderCombinatorParameters {
  factoryAddress: Address
  recorders: readonly Address[]
}
export type DeployRecorderCombinatorReturnType = DeployResult

export function deployRecorderCombinator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  parameters: DeployRecorderCombinatorParameters,
): Promise<DeployRecorderCombinatorReturnType> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: recorderCombinatorFactoryAbi,
    args: [parameters.recorders],
    opName: 'deployRecorderCombinator',
  })
}

// ---------------------------------------------------------------------------
// SignatureCondition
// ---------------------------------------------------------------------------

export interface ComputeSignatureConditionAddressParameters {
  factoryAddress: Address
  signer: Address
}
export type ComputeSignatureConditionAddressReturnType = Address

export function computeSignatureConditionAddress(
  publicClient: PublicClient,
  parameters: ComputeSignatureConditionAddressParameters,
): Promise<ComputeSignatureConditionAddressReturnType> {
  return computeViaFactory(publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: signatureConditionFactoryAbi,
    args: [parameters.signer],
  })
}

export interface DeploySignatureConditionParameters {
  factoryAddress: Address
  signer: Address
}
export type DeploySignatureConditionReturnType = DeployResult

export function deploySignatureCondition(
  walletClient: WalletClient,
  publicClient: PublicClient,
  parameters: DeploySignatureConditionParameters,
): Promise<DeploySignatureConditionReturnType> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: signatureConditionFactoryAbi,
    args: [parameters.signer],
    opName: 'deploySignatureCondition',
  })
}

// ---------------------------------------------------------------------------
// RefundRequest
// ---------------------------------------------------------------------------

export interface ComputeRefundRequestAddressParameters {
  factoryAddress: Address
  arbiter: Address
}
export type ComputeRefundRequestAddressReturnType = Address

export function computeRefundRequestAddress(
  publicClient: PublicClient,
  parameters: ComputeRefundRequestAddressParameters,
): Promise<ComputeRefundRequestAddressReturnType> {
  return computeViaFactory(publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: refundRequestFactoryAbi,
    args: [parameters.arbiter],
  })
}

export interface DeployRefundRequestParameters {
  factoryAddress: Address
  arbiter: Address
}
export type DeployRefundRequestReturnType = DeployResult

export function deployRefundRequest(
  walletClient: WalletClient,
  publicClient: PublicClient,
  parameters: DeployRefundRequestParameters,
): Promise<DeployRefundRequestReturnType> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: refundRequestFactoryAbi,
    args: [parameters.arbiter],
    opName: 'deployRefundRequest',
  })
}

// ---------------------------------------------------------------------------
// PaymentOperator
// ---------------------------------------------------------------------------

export interface ComputeOperatorAddressParameters {
  factoryAddress: Address
  config: OperatorConfig
}
export type ComputeOperatorAddressReturnType = Address

export function computeOperatorAddress(
  publicClient: PublicClient,
  parameters: ComputeOperatorAddressParameters,
): Promise<ComputeOperatorAddressReturnType> {
  return computeViaFactory(publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: paymentOperatorFactoryAbi,
    args: [parameters.config],
  })
}

export interface DeployOperatorParameters {
  factoryAddress: Address
  config: OperatorConfig
}
export type DeployOperatorReturnType = DeployResult

export function deployOperator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  parameters: DeployOperatorParameters,
): Promise<DeployOperatorReturnType> {
  return deployViaFactory(walletClient, publicClient, {
    factoryAddress: parameters.factoryAddress,
    abi: paymentOperatorFactoryAbi,
    args: [parameters.config],
    opName: 'deployOperator',
    functionNames: {
      deployFn: 'deployOperator',
      getDeployedFn: 'getOperator',
    },
  })
}
