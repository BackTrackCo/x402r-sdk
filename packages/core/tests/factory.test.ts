import { describe, it, expect } from 'vitest';
import {
  PaymentOperatorConfig,
  EscrowPeriodConfig,
  FreezePolicyConfig,
  createPaymentOperatorConfig,
  createEscrowPeriodConfig,
  createFreezePolicyConfig,
  PaymentOperatorFactoryABI,
  EscrowPeriodConditionFactoryABI,
  FreezePolicyFactoryABI,
  ZERO_ADDRESS,
} from '../src/factory/index.js';

describe('PaymentOperatorConfig', () => {
  it('should create a minimal config with feeRecipient', () => {
    const config = createPaymentOperatorConfig({
      feeRecipient: '0x1234567890123456789012345678901234567890',
    });

    expect(config.feeRecipient).toBe('0x1234567890123456789012345678901234567890');
    expect(config.authorizeCondition).toBe(ZERO_ADDRESS);
    expect(config.authorizeRecorder).toBe(ZERO_ADDRESS);
    expect(config.releaseCondition).toBe(ZERO_ADDRESS);
    expect(config.releaseRecorder).toBe(ZERO_ADDRESS);
  });

  it('should create a config with all conditions', () => {
    const config = createPaymentOperatorConfig({
      feeRecipient: '0x1234567890123456789012345678901234567890',
      authorizeCondition: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      authorizeRecorder: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      releaseCondition: '0xcccccccccccccccccccccccccccccccccccccccc',
      releaseRecorder: '0xdddddddddddddddddddddddddddddddddddddddd',
      refundInEscrowCondition: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      refundInEscrowRecorder: '0xffffffffffffffffffffffffffffffffffffffff',
    });

    expect(config.feeRecipient).toBe('0x1234567890123456789012345678901234567890');
    expect(config.authorizeCondition).toBe('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(config.releaseCondition).toBe('0xcccccccccccccccccccccccccccccccccccccccc');
    expect(config.refundInEscrowCondition).toBe('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
  });

  it('should have correct type structure', () => {
    const config: PaymentOperatorConfig = {
      feeRecipient: '0x1234567890123456789012345678901234567890',
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

    expect(Object.keys(config)).toHaveLength(11);
  });
});

describe('EscrowPeriodConfig', () => {
  it('should create config without freeze policy', () => {
    const config = createEscrowPeriodConfig({
      escrowPeriod: 86400n, // 1 day in seconds
    });

    expect(config.escrowPeriod).toBe(86400n);
    expect(config.freezePolicy).toBe(ZERO_ADDRESS);
  });

  it('should create config with freeze policy', () => {
    const config = createEscrowPeriodConfig({
      escrowPeriod: 604800n, // 7 days
      freezePolicy: '0x1234567890123456789012345678901234567890',
    });

    expect(config.escrowPeriod).toBe(604800n);
    expect(config.freezePolicy).toBe('0x1234567890123456789012345678901234567890');
  });

  it('should have correct type structure', () => {
    const config: EscrowPeriodConfig = {
      escrowPeriod: 86400n,
      freezePolicy: '0x0000000000000000000000000000000000000000',
    };

    expect(config.escrowPeriod).toBeDefined();
    expect(config.freezePolicy).toBeDefined();
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
  it('should export PaymentOperatorFactoryABI', () => {
    expect(PaymentOperatorFactoryABI).toBeDefined();
    expect(Array.isArray(PaymentOperatorFactoryABI)).toBe(true);
  });

  it('should have computeAddress function in PaymentOperatorFactoryABI', () => {
    const computeAddress = PaymentOperatorFactoryABI.find(
      (item) => item.type === 'function' && item.name === 'computeAddress'
    );
    expect(computeAddress).toBeDefined();
  });

  it('should have deployOperator function in PaymentOperatorFactoryABI', () => {
    const deployOperator = PaymentOperatorFactoryABI.find(
      (item) => item.type === 'function' && item.name === 'deployOperator'
    );
    expect(deployOperator).toBeDefined();
  });

  it('should have getOperator function in PaymentOperatorFactoryABI', () => {
    const getOperator = PaymentOperatorFactoryABI.find(
      (item) => item.type === 'function' && item.name === 'getOperator'
    );
    expect(getOperator).toBeDefined();
  });

  it('should export EscrowPeriodConditionFactoryABI', () => {
    expect(EscrowPeriodConditionFactoryABI).toBeDefined();
    expect(Array.isArray(EscrowPeriodConditionFactoryABI)).toBe(true);
  });

  it('should have deploy function in EscrowPeriodConditionFactoryABI', () => {
    const deploy = EscrowPeriodConditionFactoryABI.find(
      (item) => item.type === 'function' && item.name === 'deploy'
    );
    expect(deploy).toBeDefined();
  });

  it('should have computeAddresses function in EscrowPeriodConditionFactoryABI', () => {
    const computeAddresses = EscrowPeriodConditionFactoryABI.find(
      (item) => item.type === 'function' && item.name === 'computeAddresses'
    );
    expect(computeAddresses).toBeDefined();
  });

  it('should export FreezePolicyFactoryABI', () => {
    expect(FreezePolicyFactoryABI).toBeDefined();
    expect(Array.isArray(FreezePolicyFactoryABI)).toBe(true);
  });

  it('should have deploy function in FreezePolicyFactoryABI', () => {
    const deploy = FreezePolicyFactoryABI.find(
      (item) => item.type === 'function' && item.name === 'deploy'
    );
    expect(deploy).toBeDefined();
  });

  it('should have computeAddress function in FreezePolicyFactoryABI', () => {
    const computeAddress = FreezePolicyFactoryABI.find(
      (item) => item.type === 'function' && item.name === 'computeAddress'
    );
    expect(computeAddress).toBeDefined();
  });
});

describe('ZERO_ADDRESS', () => {
  it('should be a valid zero address', () => {
    expect(ZERO_ADDRESS).toBe('0x0000000000000000000000000000000000000000');
  });
});
