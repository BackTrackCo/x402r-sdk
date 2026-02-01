import { describe, it, expect } from 'vitest';
import {
  PaymentOperatorConfig,
  EscrowPeriodConfig,
  FreezePolicyConfig,
  createPaymentOperatorConfig,
  createEscrowPeriodConfig,
  createFreezePolicyConfig,
  PaymentOperatorFactoryABI,
  EscrowPeriodFactoryABI,
  FreezePolicyFactoryABI,
  FreezeFactoryABI,
  StaticFeeCalculatorFactoryABI,
  StaticAddressConditionFactoryABI,
  ZERO_ADDRESS,
  ZERO_BYTES32,
} from '../src/factory/index.js';

describe('PaymentOperatorConfig', () => {
  it('should create a minimal config with feeRecipient', () => {
    const config = createPaymentOperatorConfig({
      feeRecipient: '0x1234567890123456789012345678901234567890',
    });

    expect(config.feeRecipient).toBe('0x1234567890123456789012345678901234567890');
    expect(config.feeCalculator).toBe(ZERO_ADDRESS);
    expect(config.authorizeCondition).toBe(ZERO_ADDRESS);
    expect(config.authorizeRecorder).toBe(ZERO_ADDRESS);
    expect(config.releaseCondition).toBe(ZERO_ADDRESS);
    expect(config.releaseRecorder).toBe(ZERO_ADDRESS);
  });

  it('should create a config with all conditions', () => {
    const config = createPaymentOperatorConfig({
      feeRecipient: '0x1234567890123456789012345678901234567890',
      feeCalculator: '0x1111111111111111111111111111111111111111',
      authorizeCondition: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      authorizeRecorder: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      releaseCondition: '0xcccccccccccccccccccccccccccccccccccccccc',
      releaseRecorder: '0xdddddddddddddddddddddddddddddddddddddddd',
      refundInEscrowCondition: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      refundInEscrowRecorder: '0xffffffffffffffffffffffffffffffffffffffff',
    });

    expect(config.feeRecipient).toBe('0x1234567890123456789012345678901234567890');
    expect(config.feeCalculator).toBe('0x1111111111111111111111111111111111111111');
    expect(config.authorizeCondition).toBe('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(config.releaseCondition).toBe('0xcccccccccccccccccccccccccccccccccccccccc');
    expect(config.refundInEscrowCondition).toBe('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
  });

  it('should have correct type structure with 12 fields', () => {
    const config: PaymentOperatorConfig = {
      feeRecipient: '0x1234567890123456789012345678901234567890',
      feeCalculator: '0x0000000000000000000000000000000000000000',
      authorizeCondition: '0x0000000000000000000000000000000000000000',
      authorizeRecorder: '0x0000000000000000000000000000000000000000',
      chargeCondition: '0x0000000000000000000000000000000000000000',
      chargeRecorder: '0x0000000000000000000000000000000000000000',
      releaseCondition: '0x0000000000000000000000000000000000000000',
      releaseRecorder: '0x0000000000000000000000000000000000000000',
      refundInEscrowCondition: '0x0000000000000000000000000000000000000000',
      refundInEscrowRecorder: '0x0000000000000000000000000000000000000000',
      refundPostEscrowCondition: '0x0000000000000000000000000000000000000000',
      refundPostEscrowRecorder: '0x0000000000000000000000000000000000000000',
    };

    expect(Object.keys(config)).toHaveLength(12);
  });
});

describe('EscrowPeriodConfig', () => {
  it('should create config with default authorizedCodehash', () => {
    const config = createEscrowPeriodConfig({
      escrowPeriod: 86400n, // 1 day in seconds
    });

    expect(config.escrowPeriod).toBe(86400n);
    expect(config.authorizedCodehash).toBe(ZERO_BYTES32);
  });

  it('should create config with custom authorizedCodehash', () => {
    const customCodehash = '0x1234567890123456789012345678901234567890123456789012345678901234';
    const config = createEscrowPeriodConfig({
      escrowPeriod: 604800n, // 7 days
      authorizedCodehash: customCodehash,
    });

    expect(config.escrowPeriod).toBe(604800n);
    expect(config.authorizedCodehash).toBe(customCodehash);
  });

  it('should have correct type structure', () => {
    const config: EscrowPeriodConfig = {
      escrowPeriod: 86400n,
      authorizedCodehash: ZERO_BYTES32,
    };

    expect(config.escrowPeriod).toBeDefined();
    expect(config.authorizedCodehash).toBeDefined();
  });
});

describe('FreezePolicyConfig', () => {
  it('should create config with permanent freeze', () => {
    const config = createFreezePolicyConfig({
      freezeCondition: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      unfreezeCondition: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    });

    expect(config.freezeCondition).toBe('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(config.unfreezeCondition).toBe('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    expect(config.freezeDuration).toBe(0n); // permanent
  });

  it('should create config with timed freeze', () => {
    const config = createFreezePolicyConfig({
      freezeCondition: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      unfreezeCondition: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      freezeDuration: 259200n, // 3 days
    });

    expect(config.freezeDuration).toBe(259200n);
  });

  it('should have correct type structure', () => {
    const config: FreezePolicyConfig = {
      freezeCondition: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      unfreezeCondition: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      freezeDuration: 0n,
    };

    expect(config.freezeCondition).toBeDefined();
    expect(config.unfreezeCondition).toBeDefined();
    expect(config.freezeDuration).toBeDefined();
  });
});

describe('Factory ABIs', () => {
  describe('PaymentOperatorFactoryABI', () => {
    it('should be defined and be an array', () => {
      expect(PaymentOperatorFactoryABI).toBeDefined();
      expect(Array.isArray(PaymentOperatorFactoryABI)).toBe(true);
    });

    it('should have computeAddress function', () => {
      const computeAddress = PaymentOperatorFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'computeAddress'
      );
      expect(computeAddress).toBeDefined();
    });

    it('should have deployOperator function', () => {
      const deployOperator = PaymentOperatorFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'deployOperator'
      );
      expect(deployOperator).toBeDefined();
    });

    it('should have getOperator function', () => {
      const getOperator = PaymentOperatorFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'getOperator'
      );
      expect(getOperator).toBeDefined();
    });
  });

  describe('EscrowPeriodFactoryABI', () => {
    it('should be defined and be an array', () => {
      expect(EscrowPeriodFactoryABI).toBeDefined();
      expect(Array.isArray(EscrowPeriodFactoryABI)).toBe(true);
    });

    it('should have deploy function', () => {
      const deploy = EscrowPeriodFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'deploy'
      );
      expect(deploy).toBeDefined();
    });

    it('should have computeAddress function (not computeAddresses)', () => {
      const computeAddress = EscrowPeriodFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'computeAddress'
      );
      expect(computeAddress).toBeDefined();

      const computeAddresses = EscrowPeriodFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'computeAddresses'
      );
      expect(computeAddresses).toBeUndefined(); // Should NOT exist
    });

    it('should have getDeployed function', () => {
      const getDeployed = EscrowPeriodFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'getDeployed'
      );
      expect(getDeployed).toBeDefined();
    });
  });

  describe('FreezePolicyFactoryABI', () => {
    it('should be defined and be an array', () => {
      expect(FreezePolicyFactoryABI).toBeDefined();
      expect(Array.isArray(FreezePolicyFactoryABI)).toBe(true);
    });

    it('should have deploy function', () => {
      const deploy = FreezePolicyFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'deploy'
      );
      expect(deploy).toBeDefined();
    });

    it('should have computeAddress function', () => {
      const computeAddress = FreezePolicyFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'computeAddress'
      );
      expect(computeAddress).toBeDefined();
    });
  });

  describe('FreezeFactoryABI', () => {
    it('should be defined and be an array', () => {
      expect(FreezeFactoryABI).toBeDefined();
      expect(Array.isArray(FreezeFactoryABI)).toBe(true);
    });

    it('should have deploy function', () => {
      const deploy = FreezeFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'deploy'
      );
      expect(deploy).toBeDefined();
    });

    it('should have computeAddress function', () => {
      const computeAddress = FreezeFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'computeAddress'
      );
      expect(computeAddress).toBeDefined();
    });
  });

  describe('StaticFeeCalculatorFactoryABI', () => {
    it('should be defined and be an array', () => {
      expect(StaticFeeCalculatorFactoryABI).toBeDefined();
      expect(Array.isArray(StaticFeeCalculatorFactoryABI)).toBe(true);
    });

    it('should have deploy function', () => {
      const deploy = StaticFeeCalculatorFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'deploy'
      );
      expect(deploy).toBeDefined();
    });

    it('should have computeAddress function', () => {
      const computeAddress = StaticFeeCalculatorFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'computeAddress'
      );
      expect(computeAddress).toBeDefined();
    });
  });

  describe('StaticAddressConditionFactoryABI', () => {
    it('should be defined and be an array', () => {
      expect(StaticAddressConditionFactoryABI).toBeDefined();
      expect(Array.isArray(StaticAddressConditionFactoryABI)).toBe(true);
    });

    it('should have deploy function', () => {
      const deploy = StaticAddressConditionFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'deploy'
      );
      expect(deploy).toBeDefined();
    });

    it('should have computeAddress function', () => {
      const computeAddress = StaticAddressConditionFactoryABI.find(
        (item) => item.type === 'function' && item.name === 'computeAddress'
      );
      expect(computeAddress).toBeDefined();
    });
  });
});

describe('Constants', () => {
  it('ZERO_ADDRESS should be a valid zero address', () => {
    expect(ZERO_ADDRESS).toBe('0x0000000000000000000000000000000000000000');
  });

  it('ZERO_BYTES32 should be a valid zero bytes32', () => {
    expect(ZERO_BYTES32).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
  });
});
