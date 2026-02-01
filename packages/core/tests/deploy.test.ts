import { describe, it, expect } from 'vitest';
import {
  // Types
  type DeploymentResult,
  type ResolveConditionResult,
  type MarketplaceOperatorOptions,
  type MarketplaceOperatorDeployment,
  type MarketplaceOperatorPreview,
  // Factory functions (just check exports)
  computeStaticFeeCalculatorAddress,
  deployStaticFeeCalculator,
  computeEscrowPeriodAddress,
  deployEscrowPeriod,
  computeFreezePolicyAddress,
  deployFreezePolicy,
  computeFreezeAddress,
  deployFreeze,
  computeStaticAddressConditionAddress,
  deployStaticAddressCondition,
  computeAndConditionAddress,
  deployAndCondition,
  computeOrConditionAddress,
  deployOrCondition,
  computeNotConditionAddress,
  deployNotCondition,
  computeOperatorAddress,
  deployOperator,
  // Condition resolution
  resolveConditionConfig,
  previewConditionAddress,
  // Presets
  previewMarketplaceOperator,
  deployMarketplaceOperator,
} from '../src/deploy/index.js';

describe('Deploy module exports', () => {
  it('should export all factory deployment functions', () => {
    expect(computeStaticFeeCalculatorAddress).toBeDefined();
    expect(deployStaticFeeCalculator).toBeDefined();
    expect(computeEscrowPeriodAddress).toBeDefined();
    expect(deployEscrowPeriod).toBeDefined();
    expect(computeFreezePolicyAddress).toBeDefined();
    expect(deployFreezePolicy).toBeDefined();
    expect(computeFreezeAddress).toBeDefined();
    expect(deployFreeze).toBeDefined();
    expect(computeStaticAddressConditionAddress).toBeDefined();
    expect(deployStaticAddressCondition).toBeDefined();
    expect(computeAndConditionAddress).toBeDefined();
    expect(deployAndCondition).toBeDefined();
    expect(computeOrConditionAddress).toBeDefined();
    expect(deployOrCondition).toBeDefined();
    expect(computeNotConditionAddress).toBeDefined();
    expect(deployNotCondition).toBeDefined();
    expect(computeOperatorAddress).toBeDefined();
    expect(deployOperator).toBeDefined();
  });

  it('should export condition resolution functions', () => {
    expect(resolveConditionConfig).toBeDefined();
    expect(previewConditionAddress).toBeDefined();
  });

  it('should export marketplace preset functions', () => {
    expect(previewMarketplaceOperator).toBeDefined();
    expect(deployMarketplaceOperator).toBeDefined();
  });

  it('should export all functions as proper functions', () => {
    expect(typeof computeStaticFeeCalculatorAddress).toBe('function');
    expect(typeof deployStaticFeeCalculator).toBe('function');
    expect(typeof resolveConditionConfig).toBe('function');
    expect(typeof previewConditionAddress).toBe('function');
    expect(typeof previewMarketplaceOperator).toBe('function');
    expect(typeof deployMarketplaceOperator).toBe('function');
  });
});

describe('Type definitions', () => {
  it('DeploymentResult should have correct shape', () => {
    const result: DeploymentResult = {
      address: '0x1234567890123456789012345678901234567890',
      isNewDeployment: true,
      txHash: '0xabcd',
    };
    expect(result.address).toBeDefined();
    expect(result.isNewDeployment).toBe(true);
    expect(result.txHash).toBe('0xabcd');
  });

  it('DeploymentResult should work without txHash for existing contracts', () => {
    const result: DeploymentResult = {
      address: '0x1234567890123456789012345678901234567890',
      isNewDeployment: false,
    };
    expect(result.address).toBeDefined();
    expect(result.isNewDeployment).toBe(false);
    expect(result.txHash).toBeUndefined();
  });

  it('MarketplaceOperatorOptions should have correct shape', () => {
    const options: MarketplaceOperatorOptions = {
      feeRecipient: '0x1234567890123456789012345678901234567890',
      arbiter: '0xabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd',
      escrowPeriodSeconds: 604800n,
      freezeDurationSeconds: 259200n,
      operatorFeeBps: 100n,
    };
    expect(options.feeRecipient).toBeDefined();
    expect(options.arbiter).toBeDefined();
    expect(options.escrowPeriodSeconds).toBe(604800n);
  });

  it('MarketplaceOperatorOptions should work with minimal options', () => {
    const options: MarketplaceOperatorOptions = {
      feeRecipient: '0x1234567890123456789012345678901234567890',
      arbiter: '0xabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd',
      escrowPeriodSeconds: 604800n,
    };
    expect(options.freezeDurationSeconds).toBeUndefined();
    expect(options.operatorFeeBps).toBeUndefined();
  });
});

describe('Condition resolution types', () => {
  it('ResolveConditionResult should have correct shape', () => {
    const result: ResolveConditionResult = {
      address: '0x1234567890123456789012345678901234567890',
      deployments: [],
    };
    expect(result.address).toBeDefined();
    expect(result.deployments).toHaveLength(0);
  });

  it('ResolveConditionResult should track multiple deployments', () => {
    const result: ResolveConditionResult = {
      address: '0x1234567890123456789012345678901234567890',
      deployments: [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          isNewDeployment: true,
          txHash: '0x1111',
        },
        {
          address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          isNewDeployment: false,
        },
      ],
    };
    expect(result.deployments).toHaveLength(2);
    expect(result.deployments[0].isNewDeployment).toBe(true);
    expect(result.deployments[1].isNewDeployment).toBe(false);
  });
});

describe('MarketplaceOperatorDeployment type', () => {
  it('should have all required fields', () => {
    const deployment: MarketplaceOperatorDeployment = {
      operatorAddress: '0x1234567890123456789012345678901234567890',
      escrowPeriodAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      freezePolicyAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      freezeAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
      arbiterConditionAddress: '0xdddddddddddddddddddddddddddddddddddddddd',
      refundInEscrowCondition: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      feeCalculatorAddress: null,
      txHashes: [],
      summary: {
        newDeployments: 5,
        existingContracts: 2,
      },
    };
    expect(deployment.operatorAddress).toBeDefined();
    expect(deployment.feeCalculatorAddress).toBeNull();
    expect(deployment.summary.newDeployments).toBe(5);
  });
});

describe('MarketplaceOperatorPreview type', () => {
  it('should have all required fields', () => {
    const preview: MarketplaceOperatorPreview = {
      operatorAddress: '0x1234567890123456789012345678901234567890',
      escrowPeriodAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      freezePolicyAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      freezeAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
      arbiterConditionAddress: '0xdddddddddddddddddddddddddddddddddddddddd',
      refundInEscrowCondition: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      feeCalculatorAddress: '0xffffffffffffffffffffffffffffffffffffffff',
    };
    expect(preview.operatorAddress).toBeDefined();
    expect(preview.feeCalculatorAddress).not.toBeNull();
  });

  it('should allow null feeCalculatorAddress', () => {
    const preview: MarketplaceOperatorPreview = {
      operatorAddress: '0x1234567890123456789012345678901234567890',
      escrowPeriodAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      freezePolicyAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      freezeAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
      arbiterConditionAddress: '0xdddddddddddddddddddddddddddddddddddddddd',
      refundInEscrowCondition: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      feeCalculatorAddress: null,
    };
    expect(preview.feeCalculatorAddress).toBeNull();
  });
});
