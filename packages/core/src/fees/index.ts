/**
 * Fee calculation utilities for X402r SDK
 * @module fees
 */

import type { PublicClient, Address } from "viem";
import type { PaymentInfo } from "../types/index.js";
import { PaymentOperatorABI, IFeeCalculatorABI, ProtocolFeeConfigABI } from "../abis/index.js";
import { toAbiPaymentInfo } from "../utils/index.js";

/**
 * Result of fee calculation
 */
export interface FeeCalculationResult {
  /** Protocol fee in basis points */
  protocolFeeBps: bigint;
  /** Operator fee in basis points */
  operatorFeeBps: bigint;
  /** Total fee in basis points (protocol + operator) */
  totalFeeBps: bigint;
  /** Protocol fee amount in token units */
  protocolFeeAmount: bigint;
  /** Operator fee amount in token units */
  operatorFeeAmount: bigint;
  /** Total fee amount in token units */
  totalFeeAmount: bigint;
  /** Net amount after fees */
  netAmount: bigint;
}

/**
 * Addresses used for fee calculation
 */
export interface FeeAddresses {
  /** Operator's fee calculator address (address(0) if none) */
  operatorFeeCalculator: Address;
  /** Protocol fee config address */
  protocolFeeConfig: Address;
  /** Protocol fee calculator address (address(0) if none) */
  protocolFeeCalculator: Address;
  /** Operator fee recipient */
  operatorFeeRecipient: Address;
  /** Protocol fee recipient */
  protocolFeeRecipient: Address;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

/**
 * Get the fee-related addresses from an operator
 *
 * @param publicClient - Viem public client
 * @param operatorAddress - PaymentOperator contract address
 * @returns Fee-related addresses
 */
export async function getFeeAddresses(
  publicClient: PublicClient,
  operatorAddress: Address,
): Promise<FeeAddresses> {
  const [feeCalculator, protocolFeeConfig, feeRecipient] = await Promise.all([
    publicClient.readContract({
      address: operatorAddress,
      abi: PaymentOperatorABI,
      functionName: "FEE_CALCULATOR",
    }) as Promise<Address>,
    publicClient.readContract({
      address: operatorAddress,
      abi: PaymentOperatorABI,
      functionName: "PROTOCOL_FEE_CONFIG",
    }) as Promise<Address>,
    publicClient.readContract({
      address: operatorAddress,
      abi: PaymentOperatorABI,
      functionName: "FEE_RECIPIENT",
    }) as Promise<Address>,
  ]);

  // Get protocol fee config details
  let protocolFeeCalculator: Address = ZERO_ADDRESS;
  let protocolFeeRecipient: Address = ZERO_ADDRESS;

  if (protocolFeeConfig !== ZERO_ADDRESS) {
    [protocolFeeCalculator, protocolFeeRecipient] = await Promise.all([
      publicClient.readContract({
        address: protocolFeeConfig,
        abi: ProtocolFeeConfigABI,
        functionName: "calculator",
      }) as Promise<Address>,
      publicClient.readContract({
        address: protocolFeeConfig,
        abi: ProtocolFeeConfigABI,
        functionName: "protocolFeeRecipient",
      }) as Promise<Address>,
    ]);
  }

  return {
    operatorFeeCalculator: feeCalculator,
    protocolFeeConfig,
    protocolFeeCalculator,
    operatorFeeRecipient: feeRecipient,
    protocolFeeRecipient,
  };
}

/**
 * Calculate the operator fee for a payment
 *
 * @param publicClient - Viem public client
 * @param operatorAddress - PaymentOperator contract address
 * @param paymentInfo - Payment info struct
 * @param amount - Amount to calculate fee for
 * @param caller - Address that will call the payment action
 * @returns Fee in basis points (0 if no fee calculator)
 */
export async function calculateOperatorFeeBps(
  publicClient: PublicClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
  caller: Address,
): Promise<bigint> {
  // Get the fee calculator address
  const feeCalculator = (await publicClient.readContract({
    address: operatorAddress,
    abi: PaymentOperatorABI,
    functionName: "FEE_CALCULATOR",
  })) as Address;

  // If no fee calculator, return 0
  if (feeCalculator === ZERO_ADDRESS) {
    return 0n;
  }

  const feeBps = (await publicClient.readContract({
    address: feeCalculator,
    abi: IFeeCalculatorABI,
    functionName: "calculateFee",
    args: [toAbiPaymentInfo(paymentInfo), amount, caller],
  })) as bigint;

  return feeBps;
}

/**
 * Calculate the protocol fee for a payment
 *
 * @param publicClient - Viem public client
 * @param operatorAddress - PaymentOperator contract address
 * @param paymentInfo - Payment info struct
 * @param amount - Amount to calculate fee for
 * @param caller - Address that will call the payment action
 * @returns Fee in basis points (0 if no protocol fee config)
 */
export async function calculateProtocolFeeBps(
  publicClient: PublicClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
  caller: Address,
): Promise<bigint> {
  // Get the protocol fee config address
  const protocolFeeConfig = (await publicClient.readContract({
    address: operatorAddress,
    abi: PaymentOperatorABI,
    functionName: "PROTOCOL_FEE_CONFIG",
  })) as Address;

  // If no protocol fee config, return 0
  if (protocolFeeConfig === ZERO_ADDRESS) {
    return 0n;
  }

  const feeBps = (await publicClient.readContract({
    address: protocolFeeConfig,
    abi: ProtocolFeeConfigABI,
    functionName: "getProtocolFeeBps",
    args: [toAbiPaymentInfo(paymentInfo), amount, caller],
  })) as bigint;

  return feeBps;
}

/**
 * Calculate total fees for a payment (protocol + operator)
 *
 * @param publicClient - Viem public client
 * @param operatorAddress - PaymentOperator contract address
 * @param paymentInfo - Payment info struct
 * @param amount - Amount to calculate fees for
 * @param caller - Address that will call the payment action
 * @returns Detailed fee breakdown
 *
 * @example
 * ```typescript
 * const fees = await calculateTotalFees(
 *   publicClient,
 *   operatorAddress,
 *   paymentInfo,
 *   1000000n, // 1 USDC
 *   callerAddress
 * );
 * console.log(`Protocol: ${fees.protocolFeeBps} bps, Operator: ${fees.operatorFeeBps} bps`);
 * console.log(`Total fee: ${fees.totalFeeAmount} (${fees.totalFeeBps} bps)`);
 * ```
 */
export async function calculateTotalFees(
  publicClient: PublicClient,
  operatorAddress: Address,
  paymentInfo: PaymentInfo,
  amount: bigint,
  caller: Address,
): Promise<FeeCalculationResult> {
  // Fetch both fees in parallel
  const [protocolFeeBps, operatorFeeBps] = await Promise.all([
    calculateProtocolFeeBps(publicClient, operatorAddress, paymentInfo, amount, caller),
    calculateOperatorFeeBps(publicClient, operatorAddress, paymentInfo, amount, caller),
  ]);

  const totalFeeBps = protocolFeeBps + operatorFeeBps;

  // Calculate amounts (basis points = 1/100 of a percent, so divide by 10000)
  const protocolFeeAmount = (amount * protocolFeeBps) / 10000n;
  const operatorFeeAmount = (amount * operatorFeeBps) / 10000n;
  const totalFeeAmount = protocolFeeAmount + operatorFeeAmount;
  const netAmount = amount - totalFeeAmount;

  return {
    protocolFeeBps,
    operatorFeeBps,
    totalFeeBps,
    protocolFeeAmount,
    operatorFeeAmount,
    totalFeeAmount,
    netAmount,
  };
}

/**
 * Validate that fees are within the payment's acceptable bounds
 *
 * @param fees - Calculated fees
 * @param paymentInfo - Payment info with minFeeBps and maxFeeBps
 * @returns true if fees are within bounds
 */
export function validateFeeBounds(fees: FeeCalculationResult, paymentInfo: PaymentInfo): boolean {
  return (
    fees.totalFeeBps >= BigInt(paymentInfo.minFeeBps) &&
    fees.totalFeeBps <= BigInt(paymentInfo.maxFeeBps)
  );
}

/**
 * Format fee information as a human-readable string
 *
 * @param fees - Calculated fees
 * @param decimals - Token decimals (default: 6 for USDC)
 * @param symbol - Token symbol (default: 'USDC')
 * @returns Formatted string
 */
export function formatFeeBreakdown(
  fees: FeeCalculationResult,
  decimals: number = 6,
  symbol: string = "USDC",
): string {
  const formatAmount = (amount: bigint): string => {
    const divisor = 10n ** BigInt(decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, "0");
    return `${whole}.${fractionalStr} ${symbol}`;
  };

  const formatBps = (bps: bigint): string => {
    const percent = Number(bps) / 100;
    return `${bps} bps (${percent.toFixed(2)}%)`;
  };

  return [
    `Fee Breakdown:`,
    `  Protocol Fee: ${formatBps(fees.protocolFeeBps)} = ${formatAmount(fees.protocolFeeAmount)}`,
    `  Operator Fee: ${formatBps(fees.operatorFeeBps)} = ${formatAmount(fees.operatorFeeAmount)}`,
    `  Total Fee:    ${formatBps(fees.totalFeeBps)} = ${formatAmount(fees.totalFeeAmount)}`,
    `  Net Amount:   ${formatAmount(fees.netAmount)}`,
  ].join("\n");
}
