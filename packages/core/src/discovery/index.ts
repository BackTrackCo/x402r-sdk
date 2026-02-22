/**
 * Operator deployment discovery utilities
 * @module discovery
 */

import type { PublicClient } from "viem";
import { paymentOperatorAbi } from "../abis/index.js";
import { resolveAddresses, type ResolvedAddresses } from "../config/index.js";

/**
 * Combined operator deployment info: on-chain operator config + network addresses
 */
export interface OperatorDeployment {
  /** Operator contract address */
  operatorAddress: `0x${string}`;
  /** Escrow contract from operator config */
  escrowAddress: `0x${string}`;
  /** Fee recipient from operator config */
  feeRecipient: `0x${string}`;
  /** Fee calculator from operator config */
  feeCalculator: `0x${string}`;
  /** Protocol fee config from operator config */
  protocolFeeConfig: `0x${string}`;
  /** Authorize condition from operator config */
  authorizeCondition: `0x${string}`;
  /** Release condition from operator config */
  releaseCondition: `0x${string}`;
  /** Network-level resolved addresses */
  network: ResolvedAddresses;
}

/**
 * Discover operator deployment details by reading on-chain config
 * and combining with known network addresses.
 *
 * @param operatorAddress - The PaymentOperator contract address
 * @param publicClient - viem PublicClient
 * @param networkId - EIP-155 chain identifier (e.g., 'eip155:84532')
 * @returns Combined operator + network deployment info
 * @throws Error if operator address is invalid or network is not supported
 *
 * @example
 * ```typescript
 * const deployment = await getOperatorDeployment(
 *   '0x1234...',
 *   publicClient,
 *   'eip155:84532'
 * );
 * console.log(`Escrow: ${deployment.escrowAddress}`);
 * console.log(`RefundRequest: ${deployment.network.refundRequestAddress}`);
 * ```
 */
export async function getOperatorDeployment(
  operatorAddress: `0x${string}`,
  publicClient: PublicClient,
  networkId: string,
): Promise<OperatorDeployment> {
  const network = resolveAddresses(networkId);

  const [
    escrow,
    feeRecipient,
    feeCalculator,
    protocolFeeConfigAddr,
    authorizeCondition,
    releaseCondition,
  ] = await Promise.all([
    publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: "ESCROW",
    }) as Promise<`0x${string}`>,
    publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: "FEE_RECIPIENT",
    }) as Promise<`0x${string}`>,
    publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: "FEE_CALCULATOR",
    }) as Promise<`0x${string}`>,
    publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: "PROTOCOL_FEE_CONFIG",
    }) as Promise<`0x${string}`>,
    publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: "AUTHORIZE_CONDITION",
    }) as Promise<`0x${string}`>,
    publicClient.readContract({
      address: operatorAddress,
      abi: paymentOperatorAbi,
      functionName: "RELEASE_CONDITION",
    }) as Promise<`0x${string}`>,
  ]);

  return {
    operatorAddress,
    escrowAddress: escrow,
    feeRecipient,
    feeCalculator,
    protocolFeeConfig: protocolFeeConfigAddr,
    authorizeCondition,
    releaseCondition,
    network,
  };
}
