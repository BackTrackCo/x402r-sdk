/**
 * Deployment presets for X402r SDK
 * @module deploy/presets
 */

import type { WalletClient, PublicClient, Address, Hash } from "viem";
import { getNetworkConfig, getConditionSingletons } from "../config/index.js";
import { ZERO_ADDRESS } from "../factory/index.js";
import {
  deployEscrowPeriod,
  deployFreeze,
  deployStaticFeeCalculator,
  deployStaticAddressCondition,
  deployOrCondition,
  deployOperator,
  computeEscrowPeriodAddress,
  computeFreezeAddress,
  computeStaticFeeCalculatorAddress,
  computeStaticAddressConditionAddress,
  computeOrConditionAddress,
  computeOperatorAddress,
  type DeploymentResult,
} from "./factories.js";
import { createPaymentOperatorConfig as createConfig } from "../factory/index.js";

// ============ Types ============

/**
 * Options for deploying a marketplace operator
 */
export interface MarketplaceOperatorOptions {
  /** Address to receive operator fees */
  feeRecipient: Address;
  /** Arbiter address for dispute resolution */
  arbiter: Address;
  /** Duration of the escrow period in seconds (e.g., 604800n for 7 days) */
  escrowPeriodSeconds: bigint;
  /** Duration that freezes last in seconds (0 = permanent until unfrozen) */
  freezeDurationSeconds?: bigint;
  /** Operator fee in basis points (100 = 1%) */
  operatorFeeBps?: bigint;
}

/**
 * Result from deploying a marketplace operator
 */
export interface MarketplaceOperatorDeployment {
  /** The deployed PaymentOperator address */
  operatorAddress: Address;
  /** The EscrowPeriod contract address */
  escrowPeriodAddress: Address;
  /** The Freeze contract address */
  freezeAddress: Address;
  /** StaticAddressCondition for arbiter */
  arbiterConditionAddress: Address;
  /** OR(Receiver, Arbiter) condition for refundInEscrow */
  refundInEscrowCondition: Address;
  /** StaticFeeCalculator address (null if no operator fee) */
  feeCalculatorAddress: Address | null;
  /** All transaction hashes from deployments */
  txHashes: Hash[];
  /** Summary of what was deployed vs already existed */
  summary: {
    newDeployments: number;
    existingContracts: number;
  };
}

/**
 * Preview of addresses for a marketplace operator (no deployment)
 */
export interface MarketplaceOperatorPreview {
  operatorAddress: Address;
  escrowPeriodAddress: Address;
  freezeAddress: Address;
  arbiterConditionAddress: Address;
  refundInEscrowCondition: Address;
  feeCalculatorAddress: Address | null;
}

// ============ Preview Functions ============

/**
 * Preview all addresses for a marketplace operator without deploying
 *
 * This is useful for checking what addresses will be created before
 * actually deploying, or for verifying if contracts already exist.
 *
 * @param publicClient - Viem public client
 * @param networkId - EIP-155 chain identifier
 * @param options - Marketplace operator configuration
 * @returns Preview of all addresses
 */
export async function previewMarketplaceOperator(
  publicClient: PublicClient,
  networkId: string,
  options: MarketplaceOperatorOptions,
): Promise<MarketplaceOperatorPreview> {
  const config = getNetworkConfig(networkId);
  if (!config) {
    throw new Error(`Network ${networkId} is not supported`);
  }

  const singletons = getConditionSingletons(networkId);

  // 1. Compute EscrowPeriod address
  const escrowPeriodAddress = await computeEscrowPeriodAddress(
    publicClient,
    networkId,
    { escrowPeriod: options.escrowPeriodSeconds },
  );

  // 2. Compute Freeze address (payer can freeze, receiver can unfreeze)
  const freezeAddress = await computeFreezeAddress(publicClient, networkId, {
    freezeCondition: singletons.payer,
    unfreezeCondition: singletons.receiver,
    freezeDuration: options.freezeDurationSeconds ?? 0n,
    escrowPeriodContract: escrowPeriodAddress,
  });

  // 3. Compute arbiter condition address
  const arbiterConditionAddress = await computeStaticAddressConditionAddress(
    publicClient,
    networkId,
    options.arbiter,
  );

  // 4. Compute refundInEscrow condition: OR(Receiver, Arbiter)
  const refundInEscrowCondition = await computeOrConditionAddress(
    publicClient,
    networkId,
    [singletons.receiver, arbiterConditionAddress],
  );

  // 5. Compute fee calculator if needed
  let feeCalculatorAddress: Address | null = null;
  if (options.operatorFeeBps && options.operatorFeeBps > 0n) {
    feeCalculatorAddress = await computeStaticFeeCalculatorAddress(
      publicClient,
      networkId,
      options.operatorFeeBps,
    );
  }

  // 6. Compute operator address
  const operatorConfig = createConfig({
    feeRecipient: options.feeRecipient,
    feeCalculator: feeCalculatorAddress ?? ZERO_ADDRESS,
    authorizeCondition: config.usdcTvlLimit, // Safety limit
    authorizeRecorder: escrowPeriodAddress, // Records auth timestamp
    releaseCondition: escrowPeriodAddress, // Checks escrow period passed
    refundInEscrowCondition: refundInEscrowCondition, // OR(Receiver, Arbiter)
    refundPostEscrowCondition: singletons.receiver, // Only receiver after escrow
  });

  const operatorAddress = await computeOperatorAddress(
    publicClient,
    networkId,
    operatorConfig,
  );

  return {
    operatorAddress,
    escrowPeriodAddress,
    freezeAddress,
    arbiterConditionAddress,
    refundInEscrowCondition,
    feeCalculatorAddress,
  };
}

// ============ Deployment Functions ============

/**
 * Deploy a complete marketplace operator with escrow, freeze, and refund support
 *
 * This high-level function deploys all necessary contracts for a marketplace-style
 * payment operator with:
 * - Escrow period before funds can be released
 * - Freeze capability for the payer during escrow
 * - Refund conditions: receiver or arbiter during escrow, only receiver after
 *
 * @param walletClient - Viem wallet client with account
 * @param publicClient - Viem public client
 * @param networkId - EIP-155 chain identifier
 * @param options - Marketplace operator configuration
 * @returns Deployment result with all addresses and transaction hashes
 *
 * @example
 * ```typescript
 * const result = await deployMarketplaceOperator(
 *   walletClient,
 *   publicClient,
 *   'eip155:84532',
 *   {
 *     feeRecipient: '0x1234...',
 *     arbiter: '0xABCD...',
 *     escrowPeriodSeconds: 604800n, // 7 days
 *     operatorFeeBps: 100n, // 1%
 *   }
 * );
 *
 * console.log('Operator deployed at:', result.operatorAddress);
 * console.log('New deployments:', result.summary.newDeployments);
 * ```
 */
export async function deployMarketplaceOperator(
  walletClient: WalletClient,
  publicClient: PublicClient,
  networkId: string,
  options: MarketplaceOperatorOptions,
): Promise<MarketplaceOperatorDeployment> {
  const config = getNetworkConfig(networkId);
  if (!config) {
    throw new Error(`Network ${networkId} is not supported`);
  }

  const singletons = getConditionSingletons(networkId);
  const txHashes: Hash[] = [];
  let newDeployments = 0;
  let existingContracts = 0;

  const trackDeployment = (result: DeploymentResult) => {
    if (result.isNewDeployment) {
      newDeployments++;
      if (result.txHash) {
        txHashes.push(result.txHash);
      }
    } else {
      existingContracts++;
    }
  };

  // 1. Deploy EscrowPeriod
  const escrowPeriodResult = await deployEscrowPeriod(
    walletClient,
    publicClient,
    networkId,
    { escrowPeriod: options.escrowPeriodSeconds },
  );
  trackDeployment(escrowPeriodResult);

  // 2. Deploy Freeze (payer can freeze, receiver can unfreeze)
  const freezeResult = await deployFreeze(
    walletClient,
    publicClient,
    networkId,
    {
      freezeCondition: singletons.payer,
      unfreezeCondition: singletons.receiver,
      freezeDuration: options.freezeDurationSeconds ?? 0n,
      escrowPeriodContract: escrowPeriodResult.address,
    },
  );
  trackDeployment(freezeResult);

  // 3. Deploy arbiter condition
  const arbiterConditionResult = await deployStaticAddressCondition(
    walletClient,
    publicClient,
    networkId,
    options.arbiter,
  );
  trackDeployment(arbiterConditionResult);

  // 4. Deploy refundInEscrow condition: OR(Receiver, Arbiter)
  const refundInEscrowResult = await deployOrCondition(
    walletClient,
    publicClient,
    networkId,
    [singletons.receiver, arbiterConditionResult.address],
  );
  trackDeployment(refundInEscrowResult);

  // 5. Deploy fee calculator if needed
  let feeCalculatorAddress: Address | null = null;
  if (options.operatorFeeBps && options.operatorFeeBps > 0n) {
    const feeCalcResult = await deployStaticFeeCalculator(
      walletClient,
      publicClient,
      networkId,
      options.operatorFeeBps,
    );
    trackDeployment(feeCalcResult);
    feeCalculatorAddress = feeCalcResult.address;
  }

  // 6. Deploy the PaymentOperator
  const operatorConfig = createConfig({
    feeRecipient: options.feeRecipient,
    feeCalculator: feeCalculatorAddress ?? ZERO_ADDRESS,
    authorizeCondition: config.usdcTvlLimit, // Safety limit
    authorizeRecorder: escrowPeriodResult.address, // Records auth timestamp
    releaseCondition: escrowPeriodResult.address, // Checks escrow period passed
    refundInEscrowCondition: refundInEscrowResult.address, // OR(Receiver, Arbiter)
    refundPostEscrowCondition: singletons.receiver, // Only receiver after escrow
  });

  const operatorResult = await deployOperator(
    walletClient,
    publicClient,
    networkId,
    operatorConfig,
  );
  trackDeployment(operatorResult);

  return {
    operatorAddress: operatorResult.address,
    escrowPeriodAddress: escrowPeriodResult.address,
    freezeAddress: freezeResult.address,
    arbiterConditionAddress: arbiterConditionResult.address,
    refundInEscrowCondition: refundInEscrowResult.address,
    feeCalculatorAddress,
    txHashes,
    summary: {
      newDeployments,
      existingContracts,
    },
  };
}
