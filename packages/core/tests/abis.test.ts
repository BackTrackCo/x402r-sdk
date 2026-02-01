import { describe, it, expect } from 'vitest';
import {
  PaymentOperatorABI,
  RefundRequestABI,
  EscrowPeriodABI,
  AuthCaptureEscrowABI,
  StaticAddressConditionABI,
  FreezePolicyABI,
  FreezeABI,
} from '../src/abis/index.js';

describe('PaymentOperatorABI', () => {
  it('should have authorize function', () => {
    const authorizeFn = PaymentOperatorABI.find(
      (item) => item.name === 'authorize' && item.type === 'function'
    );
    expect(authorizeFn).toBeDefined();
    expect(authorizeFn?.inputs).toHaveLength(4);
  });

  it('should have release function', () => {
    const releaseFn = PaymentOperatorABI.find(
      (item) => item.name === 'release' && item.type === 'function'
    );
    expect(releaseFn).toBeDefined();
  });

  it('should have refundInEscrow function', () => {
    const refundFn = PaymentOperatorABI.find(
      (item) => item.name === 'refundInEscrow' && item.type === 'function'
    );
    expect(refundFn).toBeDefined();
  });

  it('should have getPaymentState function', () => {
    const getStateFn = PaymentOperatorABI.find(
      (item) => item.name === 'getPaymentState' && item.type === 'function'
    );
    expect(getStateFn).toBeDefined();
    expect(getStateFn?.stateMutability).toBe('view');
  });

  it('should have AuthorizationCreated event', () => {
    const event = PaymentOperatorABI.find(
      (item) => item.name === 'AuthorizationCreated' && item.type === 'event'
    );
    expect(event).toBeDefined();
  });

  it('should have all required functions', () => {
    const functionNames = PaymentOperatorABI.filter(
      (item) => item.type === 'function'
    ).map((item) => item.name);

    expect(functionNames).toContain('authorize');
    expect(functionNames).toContain('release');
    expect(functionNames).toContain('refundInEscrow');
    expect(functionNames).toContain('distributeFees');
    expect(functionNames).toContain('paymentExists');
    expect(functionNames).toContain('getPaymentInfo');
    expect(functionNames).toContain('isInEscrow');
    expect(functionNames).toContain('getPaymentState');
    expect(functionNames).toContain('getPayerPayments');
    expect(functionNames).toContain('getReceiverPayments');
    expect(functionNames).toContain('ESCROW');
    expect(functionNames).toContain('FEE_RECIPIENT');
  });
});

describe('RefundRequestABI', () => {
  it('should have requestRefund function', () => {
    const requestFn = RefundRequestABI.find(
      (item) => item.name === 'requestRefund' && item.type === 'function'
    );
    expect(requestFn).toBeDefined();
  });

  it('should have updateStatus function', () => {
    const updateFn = RefundRequestABI.find(
      (item) => item.name === 'updateStatus' && item.type === 'function'
    );
    expect(updateFn).toBeDefined();
  });

  it('should have RefundRequested event', () => {
    const event = RefundRequestABI.find(
      (item) => item.name === 'RefundRequested' && item.type === 'event'
    );
    expect(event).toBeDefined();
  });

  it('should have all required functions', () => {
    const functionNames = RefundRequestABI.filter(
      (item) => item.type === 'function'
    ).map((item) => item.name);

    expect(functionNames).toContain('requestRefund');
    expect(functionNames).toContain('updateStatus');
    expect(functionNames).toContain('cancelRefundRequest');
    expect(functionNames).toContain('getRefundRequest');
    expect(functionNames).toContain('hasRefundRequest');
    expect(functionNames).toContain('getRefundRequestStatus');
    expect(functionNames).toContain('getRefundRequestByKey');
    // Paginated query functions
    expect(functionNames).toContain('getPayerRefundRequests');
    expect(functionNames).toContain('getReceiverRefundRequests');
    expect(functionNames).toContain('getPayerRefundRequest');
    expect(functionNames).toContain('getReceiverRefundRequest');
    // Count functions
    expect(functionNames).toContain('payerRefundRequestCount');
    expect(functionNames).toContain('receiverRefundRequestCount');
  });

  it('requestRefund should have amount and nonce parameters', () => {
    const requestFn = RefundRequestABI.find(
      (item) => item.name === 'requestRefund' && item.type === 'function'
    );
    expect(requestFn).toBeDefined();
    expect(requestFn?.inputs).toHaveLength(3);
    const inputNames = requestFn?.inputs?.map((i) => i.name);
    expect(inputNames).toContain('paymentInfo');
    expect(inputNames).toContain('amount');
    expect(inputNames).toContain('nonce');
  });

  it('updateStatus should have nonce parameter', () => {
    const updateFn = RefundRequestABI.find(
      (item) => item.name === 'updateStatus' && item.type === 'function'
    );
    expect(updateFn).toBeDefined();
    expect(updateFn?.inputs).toHaveLength(3);
    const inputNames = updateFn?.inputs?.map((i) => i.name);
    expect(inputNames).toContain('paymentInfo');
    expect(inputNames).toContain('nonce');
    expect(inputNames).toContain('newStatus');
  });

  it('RefundRequested event should have amount and nonce', () => {
    const event = RefundRequestABI.find(
      (item) => item.name === 'RefundRequested' && item.type === 'event'
    );
    expect(event).toBeDefined();
    const inputNames = event?.inputs?.map((i) => i.name);
    expect(inputNames).toContain('amount');
    expect(inputNames).toContain('nonce');
  });
});

describe('EscrowPeriodABI', () => {
  it('should have check function with 3 parameters (ICondition)', () => {
    const checkFn = EscrowPeriodABI.find(
      (item) => item.name === 'check' && item.type === 'function'
    );
    expect(checkFn).toBeDefined();
    expect(checkFn?.inputs).toHaveLength(3);
    const inputNames = checkFn?.inputs?.map((i) => i.name);
    expect(inputNames).toContain('paymentInfo');
    expect(inputNames).toContain('amount');
    expect(inputNames).toContain('caller');
  });

  it('should have record function (IRecorder)', () => {
    const recordFn = EscrowPeriodABI.find(
      (item) => item.name === 'record' && item.type === 'function'
    );
    expect(recordFn).toBeDefined();
    expect(recordFn?.inputs).toHaveLength(1);
  });

  it('should have isDuringEscrowPeriod function', () => {
    const fn = EscrowPeriodABI.find(
      (item) => item.name === 'isDuringEscrowPeriod' && item.type === 'function'
    );
    expect(fn).toBeDefined();
    expect(fn?.stateMutability).toBe('view');
  });

  it('should have AuthorizationTimeRecorded event', () => {
    const event = EscrowPeriodABI.find(
      (item) => item.name === 'AuthorizationTimeRecorded' && item.type === 'event'
    );
    expect(event).toBeDefined();
  });

  it('should have all required functions', () => {
    const functionNames = EscrowPeriodABI.filter(
      (item) => item.type === 'function'
    ).map((item) => item.name);

    expect(functionNames).toContain('check');
    expect(functionNames).toContain('record');
    expect(functionNames).toContain('getAuthorizationTime');
    expect(functionNames).toContain('isDuringEscrowPeriod');
    expect(functionNames).toContain('ESCROW_PERIOD');
    expect(functionNames).toContain('ESCROW');
    expect(functionNames).toContain('AUTHORIZED_CODEHASH');
    expect(functionNames).toContain('authorizationTimes');
  });

  it('should NOT have freeze functions (those are in FreezeABI)', () => {
    const functionNames = EscrowPeriodABI.filter(
      (item) => item.type === 'function'
    ).map((item) => item.name);

    expect(functionNames).not.toContain('freeze');
    expect(functionNames).not.toContain('unfreeze');
    expect(functionNames).not.toContain('isFrozen');
    expect(functionNames).not.toContain('FREEZE_POLICY');
  });
});

describe('FreezePolicyABI', () => {
  it('should have canFreeze function', () => {
    const fn = FreezePolicyABI.find(
      (item) => item.name === 'canFreeze' && item.type === 'function'
    );
    expect(fn).toBeDefined();
    expect(fn?.outputs).toHaveLength(2); // (bool allowed, uint256 duration)
  });

  it('should have canUnfreeze function', () => {
    const fn = FreezePolicyABI.find(
      (item) => item.name === 'canUnfreeze' && item.type === 'function'
    );
    expect(fn).toBeDefined();
    expect(fn?.outputs).toHaveLength(1); // bool
  });

  it('should have all immutables', () => {
    const functionNames = FreezePolicyABI.filter(
      (item) => item.type === 'function'
    ).map((item) => item.name);

    expect(functionNames).toContain('FREEZE_CONDITION');
    expect(functionNames).toContain('UNFREEZE_CONDITION');
    expect(functionNames).toContain('FREEZE_DURATION');
  });
});

describe('FreezeABI', () => {
  it('should have check function with 3 parameters (ICondition)', () => {
    const checkFn = FreezeABI.find(
      (item) => item.name === 'check' && item.type === 'function'
    );
    expect(checkFn).toBeDefined();
    expect(checkFn?.inputs).toHaveLength(3);
    const inputNames = checkFn?.inputs?.map((i) => i.name);
    expect(inputNames).toContain('paymentInfo');
    expect(inputNames).toContain('amount');
    expect(inputNames).toContain('caller');
  });

  it('should have freeze function', () => {
    const fn = FreezeABI.find(
      (item) => item.name === 'freeze' && item.type === 'function'
    );
    expect(fn).toBeDefined();
    expect(fn?.stateMutability).toBe('nonpayable');
  });

  it('should have unfreeze function', () => {
    const fn = FreezeABI.find(
      (item) => item.name === 'unfreeze' && item.type === 'function'
    );
    expect(fn).toBeDefined();
  });

  it('should have isFrozen function', () => {
    const fn = FreezeABI.find(
      (item) => item.name === 'isFrozen' && item.type === 'function'
    );
    expect(fn).toBeDefined();
    expect(fn?.stateMutability).toBe('view');
  });

  it('should have PaymentFrozen event', () => {
    const event = FreezeABI.find(
      (item) => item.name === 'PaymentFrozen' && item.type === 'event'
    );
    expect(event).toBeDefined();
  });

  it('should have PaymentUnfrozen event', () => {
    const event = FreezeABI.find(
      (item) => item.name === 'PaymentUnfrozen' && item.type === 'event'
    );
    expect(event).toBeDefined();
  });

  it('should have all required functions', () => {
    const functionNames = FreezeABI.filter(
      (item) => item.type === 'function'
    ).map((item) => item.name);

    expect(functionNames).toContain('check');
    expect(functionNames).toContain('freeze');
    expect(functionNames).toContain('unfreeze');
    expect(functionNames).toContain('isFrozen');
    expect(functionNames).toContain('ESCROW');
    expect(functionNames).toContain('FREEZE_POLICY');
    expect(functionNames).toContain('ESCROW_PERIOD_CONTRACT');
    expect(functionNames).toContain('frozenUntil');
  });

  it('should have error definitions', () => {
    const errorNames = FreezeABI.filter(
      (item) => item.type === 'error'
    ).map((item) => item.name);

    expect(errorNames).toContain('FreezeWindowExpired');
    expect(errorNames).toContain('UnauthorizedFreeze');
    expect(errorNames).toContain('AlreadyFrozen');
    expect(errorNames).toContain('NotFrozen');
  });
});

describe('AuthCaptureEscrowABI', () => {
  it('should have getHash function', () => {
    const getHashFn = AuthCaptureEscrowABI.find(
      (item) => item.name === 'getHash' && item.type === 'function'
    );
    expect(getHashFn).toBeDefined();
    expect(getHashFn?.stateMutability).toBe('pure');
  });

  it('should have paymentState function', () => {
    const paymentStateFn = AuthCaptureEscrowABI.find(
      (item) => item.name === 'paymentState' && item.type === 'function'
    );
    expect(paymentStateFn).toBeDefined();
    expect(paymentStateFn?.outputs).toHaveLength(3);
  });
});

describe('StaticAddressConditionABI', () => {
  it('should have check function with 3 parameters', () => {
    const checkFn = StaticAddressConditionABI.find(
      (item) => item.name === 'check' && item.type === 'function'
    );
    expect(checkFn).toBeDefined();
    expect(checkFn?.inputs).toHaveLength(3);
    const inputNames = checkFn?.inputs?.map((i) => i.name);
    expect(inputNames).toContain('paymentInfo');
    expect(inputNames).toContain('amount');
    expect(inputNames).toContain('caller');
    expect(checkFn?.outputs?.[0]?.type).toBe('bool');
  });

  it('should have DESIGNATED_ADDRESS function', () => {
    const addressFn = StaticAddressConditionABI.find(
      (item) => item.name === 'DESIGNATED_ADDRESS' && item.type === 'function'
    );
    expect(addressFn).toBeDefined();
  });
});

describe('ABI structure validation', () => {
  it('all ABIs should be readonly arrays', () => {
    expect(Array.isArray(PaymentOperatorABI)).toBe(true);
    expect(Array.isArray(RefundRequestABI)).toBe(true);
    expect(Array.isArray(EscrowPeriodABI)).toBe(true);
    expect(Array.isArray(AuthCaptureEscrowABI)).toBe(true);
    expect(Array.isArray(StaticAddressConditionABI)).toBe(true);
    expect(Array.isArray(FreezePolicyABI)).toBe(true);
    expect(Array.isArray(FreezeABI)).toBe(true);
  });

  it('all ABI items should have name and type', () => {
    const allAbis = [
      ...PaymentOperatorABI,
      ...RefundRequestABI,
      ...EscrowPeriodABI,
      ...AuthCaptureEscrowABI,
      ...StaticAddressConditionABI,
      ...FreezePolicyABI,
      ...FreezeABI,
    ];

    allAbis.forEach((item) => {
      expect(item.name).toBeDefined();
      expect(item.type).toBeDefined();
      expect(['function', 'event', 'error']).toContain(item.type);
    });
  });
});
