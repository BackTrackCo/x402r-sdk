import {
  type Address,
  formatUnits,
  type Hash,
  type PublicClient,
  type WalletClient,
  zeroAddress,
} from 'viem'
import {
  iFeeCalculatorAbi,
  paymentOperatorAbi,
  protocolFeeConfigAbi,
} from '../abis/generated.js'
import { ContractCallError } from '../errors/index.js'
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
 *
 * @param publicClient - Viem public client
 * @param operatorAddress - PaymentOperator contract address
 * @returns Fee addresses for operator and protocol
 *
 * @example
 * const addresses = await getFeeAddresses(publicClient, operatorAddress)
 */
export async function getFeeAddresses(
  publicClient: PublicClient,
  operatorAddress: Address,
): Promise<FeeAddresses> {
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
}

/**
 * Reads the operator fee in basis points for a given payment.
 *
 * @param publicClient - Viem public client
 * @param operatorAddress - PaymentOperator contract address
 * @param paymentInfo - Payment info struct
 * @param amount - Payment amount
 * @param caller - Address of the caller
 * @returns Operator fee in basis points, or 0n if no calculator is set
 *
 * @example
 * const bps = await calculateOperatorFeeBps(publicClient, operator, paymentInfo, amount, caller)
 */
export async function calculateOperatorFeeBps(
  publicClient: PublicClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
  caller: Address,
): Promise<bigint> {
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
}

/**
 * Reads the protocol fee in basis points for a given payment.
 *
 * @param publicClient - Viem public client
 * @param operatorAddress - PaymentOperator contract address
 * @param paymentInfo - Payment info struct
 * @param amount - Payment amount
 * @param caller - Address of the caller
 * @returns Protocol fee in basis points, or 0n if no config is set
 *
 * @example
 * const bps = await calculateProtocolFeeBps(publicClient, operator, paymentInfo, amount, caller)
 */
export async function calculateProtocolFeeBps(
  publicClient: PublicClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
  caller: Address,
): Promise<bigint> {
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
}

/**
 * Calculates the full fee breakdown for a payment, including amounts.
 *
 * @param publicClient - Viem public client
 * @param operatorAddress - PaymentOperator contract address
 * @param paymentInfo - Payment info struct
 * @param amount - Payment amount
 * @param caller - Address of the caller
 * @returns Complete fee breakdown with bps, amounts, and net amount
 *
 * @example
 * const fees = await calculateTotalFees(publicClient, operator, paymentInfo, 1000000n, caller)
 * console.log(fees.netAmount) // amount after fees
 */
export async function calculateTotalFees(
  publicClient: PublicClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
  caller: Address,
): Promise<FeeCalculationResult> {
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
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Checks whether total fees fall within the min/max bounds set in PaymentInfo.
 *
 * @param fees - Fee calculation result from `calculateTotalFees`
 * @param paymentInfo - Payment info struct containing minFeeBps and maxFeeBps
 * @returns `true` if total fee bps is within bounds
 *
 * @example
 * const valid = validateFeeBounds(fees, paymentInfo)
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
 *
 * @param fees - Fee calculation result
 * @param decimals - Token decimals (default: 6 for USDC)
 * @param symbol - Token symbol (default: "USDC")
 * @returns Human-readable fee breakdown string
 *
 * @example
 * console.log(formatFeeBreakdown(fees))
 * // "Operator: 250 bps (2.5%) (0.025 USDC) | Protocol: 100 bps (1%) (0.01 USDC) | Total: 350 bps (3.5%) (0.035 USDC)"
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

// ---------------------------------------------------------------------------
// Write functions
// ---------------------------------------------------------------------------

/**
 * Distributes accumulated fees for a token from the PaymentOperator.
 *
 * @param walletClient - Viem wallet client with account
 * @param operatorAddress - PaymentOperator contract address
 * @param token - ERC-20 token address to distribute fees for
 * @returns Transaction hash
 *
 * @example
 * const hash = await distributeFees(walletClient, operatorAddress, usdcAddress)
 */
export async function distributeFees(
  walletClient: WalletClient,
  operatorAddress: Address,
  token: Address,
): Promise<Hash> {
  const account = walletClient.account
  if (!account) {
    throw new ContractCallError('distributeFees', {
      details: 'walletClient must have an account attached',
    })
  }

  return wrapContractCall('distributeFees', () =>
    walletClient.writeContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: 'distributeFees',
      args: [token],
      chain: walletClient.chain,
      account,
    }),
  )
}
