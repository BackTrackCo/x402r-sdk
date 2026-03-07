import { type Address, formatUnits, type PublicClient, zeroAddress } from 'viem'
import {
  iFeeCalculatorAbi,
  paymentOperatorAbi,
  protocolFeeConfigAbi,
} from '../abis/generated.js'
import type { PaymentInfo } from '../types/index.js'
import { wrapContractCall } from './error-wrapping.js'

const BASIS_POINTS = 10_000n

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeeCalculationResult {
  protocolFeeBps: bigint
  operatorFeeBps: bigint
  totalFeeBps: bigint
  protocolFeeAmount: bigint
  operatorFeeAmount: bigint
  totalFeeAmount: bigint
  netAmount: bigint
}

export interface FeeAddresses {
  operatorFeeCalculator: Address
  protocolFeeConfig: Address
  protocolFeeCalculator: Address
  operatorFeeRecipient: Address
  protocolFeeRecipient: Address
}

// ---------------------------------------------------------------------------
// Read functions
// ---------------------------------------------------------------------------

/**
 * Reads all fee-related addresses from a PaymentOperator and its ProtocolFeeConfig.
 */
export async function getFeeAddresses(
  publicClient: PublicClient,
  operatorAddress: Address,
): Promise<FeeAddresses> {
  return wrapContractCall('getFeeAddresses', async () => {
    const [operatorFeeCalculator, protocolFeeConfig, operatorFeeRecipient] =
      await Promise.all([
        publicClient.readContract({
          address: operatorAddress,
          abi: paymentOperatorAbi,
          functionName: 'FEE_CALCULATOR',
        }),
        publicClient.readContract({
          address: operatorAddress,
          abi: paymentOperatorAbi,
          functionName: 'PROTOCOL_FEE_CONFIG',
        }),
        publicClient.readContract({
          address: operatorAddress,
          abi: paymentOperatorAbi,
          functionName: 'FEE_RECIPIENT',
        }),
      ])

    let protocolFeeCalculator: Address = zeroAddress
    let protocolFeeRecipient: Address = zeroAddress

    if (protocolFeeConfig !== zeroAddress) {
      ;[protocolFeeCalculator, protocolFeeRecipient] = await Promise.all([
        publicClient.readContract({
          address: protocolFeeConfig,
          abi: protocolFeeConfigAbi,
          functionName: 'calculator',
        }),
        publicClient.readContract({
          address: protocolFeeConfig,
          abi: protocolFeeConfigAbi,
          functionName: 'getProtocolFeeRecipient',
        }),
      ])
    }

    return {
      operatorFeeCalculator,
      protocolFeeConfig,
      protocolFeeCalculator,
      operatorFeeRecipient,
      protocolFeeRecipient,
    }
  })
}

/**
 * Reads the operator fee in basis points for a given payment.
 */
export async function calculateOperatorFeeBps(
  publicClient: PublicClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
  caller: Address,
): Promise<bigint> {
  return wrapContractCall('calculateOperatorFeeBps', async () => {
    const feeCalculator = await publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'FEE_CALCULATOR',
    })

    if (feeCalculator === zeroAddress) return 0n

    return publicClient.readContract({
      address: feeCalculator,
      abi: iFeeCalculatorAbi,
      functionName: 'calculateFee',
      args: [paymentInfo, amount, caller],
    })
  })
}

/**
 * Reads the protocol fee in basis points for a given payment.
 */
export async function calculateProtocolFeeBps(
  publicClient: PublicClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
  caller: Address,
): Promise<bigint> {
  return wrapContractCall('calculateProtocolFeeBps', async () => {
    const protocolFeeConfig = await publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'PROTOCOL_FEE_CONFIG',
    })

    if (protocolFeeConfig === zeroAddress) return 0n

    return publicClient.readContract({
      address: protocolFeeConfig,
      abi: protocolFeeConfigAbi,
      functionName: 'getProtocolFeeBps',
      args: [paymentInfo, amount, caller],
    })
  })
}

/**
 * Calculates the full fee breakdown for a payment, including amounts.
 */
export async function calculateTotalFees(
  publicClient: PublicClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
  caller: Address,
): Promise<FeeCalculationResult> {
  return wrapContractCall('calculateTotalFees', async () => {
    const [feeCalculator, protocolFeeConfig] = await Promise.all([
      publicClient.readContract({
        address: operatorAddress,
        abi: paymentOperatorAbi,
        functionName: 'FEE_CALCULATOR',
      }),
      publicClient.readContract({
        address: operatorAddress,
        abi: paymentOperatorAbi,
        functionName: 'PROTOCOL_FEE_CONFIG',
      }),
    ])

    const [operatorFeeBps, protocolFeeBps] = await Promise.all([
      feeCalculator === zeroAddress
        ? 0n
        : publicClient.readContract({
            address: feeCalculator,
            abi: iFeeCalculatorAbi,
            functionName: 'calculateFee',
            args: [paymentInfo, amount, caller],
          }),
      protocolFeeConfig === zeroAddress
        ? 0n
        : publicClient.readContract({
            address: protocolFeeConfig,
            abi: protocolFeeConfigAbi,
            functionName: 'getProtocolFeeBps',
            args: [paymentInfo, amount, caller],
          }),
    ])

    const totalFeeBps = operatorFeeBps + protocolFeeBps
    const operatorFeeAmount = (amount * operatorFeeBps) / BASIS_POINTS
    const protocolFeeAmount = (amount * protocolFeeBps) / BASIS_POINTS
    const totalFeeAmount = operatorFeeAmount + protocolFeeAmount
    const netAmount = amount - totalFeeAmount

    return {
      protocolFeeBps,
      operatorFeeBps,
      totalFeeBps,
      protocolFeeAmount,
      operatorFeeAmount,
      totalFeeAmount,
      netAmount,
    }
  })
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Checks whether total fees fall within the min/max bounds set in PaymentInfo.
 */
export function validateFeeBounds(
  fees: FeeCalculationResult,
  paymentInfo: PaymentInfo,
): boolean {
  return (
    fees.totalFeeBps >= BigInt(paymentInfo.minFeeBps) &&
    fees.totalFeeBps <= BigInt(paymentInfo.maxFeeBps)
  )
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/**
 * Formats a fee breakdown for display using viem's `formatUnits`.
 */
export function formatFeeBreakdown(
  fees: FeeCalculationResult,
  decimals: number = 6,
  symbol: string = 'USDC',
): string {
  const fmt = (bps: bigint, amount: bigint) =>
    `${bps} bps (${Number(bps) / 100}%) (${formatUnits(amount, decimals)} ${symbol})`

  return [
    `Operator: ${fmt(fees.operatorFeeBps, fees.operatorFeeAmount)}`,
    `Protocol: ${fmt(fees.protocolFeeBps, fees.protocolFeeAmount)}`,
    `Total: ${fmt(fees.totalFeeBps, fees.totalFeeAmount)}`,
  ].join(' | ')
}
