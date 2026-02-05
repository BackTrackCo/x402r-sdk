/**
 * Deployment helpers for X402r SDK
 *
 * This module provides helper functions for deploying protocol components
 * via the factory contracts.
 *
 * @module deploy
 *
 * @example
 * ```typescript
 * import { deployMarketplaceOperator } from '@x402r/core';
 *
 * // Deploy a complete marketplace operator
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
 * ```
 */

// Factory deployment helpers
export {
  // Types
  type DeploymentResult,
  // Static Fee Calculator
  computeStaticFeeCalculatorAddress,
  getDeployedStaticFeeCalculator,
  deployStaticFeeCalculator,
  // EscrowPeriod
  computeEscrowPeriodAddress,
  getDeployedEscrowPeriod,
  deployEscrowPeriod,
  // Freeze
  computeFreezeAddress,
  getDeployedFreeze,
  deployFreeze,
  // StaticAddressCondition
  computeStaticAddressConditionAddress,
  getDeployedStaticAddressCondition,
  deployStaticAddressCondition,
  // AndCondition
  computeAndConditionAddress,
  getDeployedAndCondition,
  deployAndCondition,
  // OrCondition
  computeOrConditionAddress,
  getDeployedOrCondition,
  deployOrCondition,
  // NotCondition
  computeNotConditionAddress,
  getDeployedNotCondition,
  deployNotCondition,
  // RecorderCombinator
  computeRecorderCombinatorAddress,
  getDeployedRecorderCombinator,
  deployRecorderCombinator,
  // PaymentOperator
  computeOperatorAddress,
  getDeployedOperator,
  deployOperator,
} from './factories.js';

// Condition resolution helpers
export {
  type ResolveConditionResult,
  resolveConditionConfig,
  previewConditionAddress,
} from './conditions.js';

// High-level presets
export {
  type MarketplaceOperatorOptions,
  type MarketplaceOperatorDeployment,
  type MarketplaceOperatorPreview,
  previewMarketplaceOperator,
  deployMarketplaceOperator,
} from './presets.js';
