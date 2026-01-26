import { describe, it, expect } from 'vitest';
import {
  // ABIs
  IConditionABI,
  PayerConditionABI,
  ReceiverConditionABI,
  AlwaysTrueConditionABI,
  StaticAddressConditionABI,
  AndConditionABI,
  OrConditionABI,
  NotConditionABI,
  // Types
  ConditionAddress,
  // Constants
  CONDITION_SINGLETONS,
  // Builder
  conditions,
} from '../src/conditions/index.js';

describe('Condition ABIs', () => {
  it('should export IConditionABI', () => {
    expect(IConditionABI).toBeDefined();
    expect(Array.isArray(IConditionABI)).toBe(true);
  });

  it('should have check function in IConditionABI', () => {
    const check = IConditionABI.find(
      (item) => item.type === 'function' && item.name === 'check'
    );
    expect(check).toBeDefined();
  });

  it('should export PayerConditionABI', () => {
    expect(PayerConditionABI).toBeDefined();
    expect(Array.isArray(PayerConditionABI)).toBe(true);
  });

  it('should export ReceiverConditionABI', () => {
    expect(ReceiverConditionABI).toBeDefined();
    expect(Array.isArray(ReceiverConditionABI)).toBe(true);
  });

  it('should export AlwaysTrueConditionABI', () => {
    expect(AlwaysTrueConditionABI).toBeDefined();
    expect(Array.isArray(AlwaysTrueConditionABI)).toBe(true);
  });

  it('should export StaticAddressConditionABI', () => {
    expect(StaticAddressConditionABI).toBeDefined();
    expect(Array.isArray(StaticAddressConditionABI)).toBe(true);
  });

  it('should have DESIGNATED_ADDRESS in StaticAddressConditionABI', () => {
    const getter = StaticAddressConditionABI.find(
      (item) => item.type === 'function' && item.name === 'DESIGNATED_ADDRESS'
    );
    expect(getter).toBeDefined();
  });

  it('should export AndConditionABI', () => {
    expect(AndConditionABI).toBeDefined();
    expect(Array.isArray(AndConditionABI)).toBe(true);
  });

  it('should have conditionCount in AndConditionABI', () => {
    const getter = AndConditionABI.find(
      (item) => item.type === 'function' && item.name === 'conditionCount'
    );
    expect(getter).toBeDefined();
  });

  it('should export OrConditionABI', () => {
    expect(OrConditionABI).toBeDefined();
    expect(Array.isArray(OrConditionABI)).toBe(true);
  });

  it('should export NotConditionABI', () => {
    expect(NotConditionABI).toBeDefined();
    expect(Array.isArray(NotConditionABI)).toBe(true);
  });
});

describe('CONDITION_SINGLETONS', () => {
  it('should have placeholder addresses for singletons', () => {
    // These will be populated with real addresses when deployed
    expect(CONDITION_SINGLETONS.PAYER).toBeDefined();
    expect(CONDITION_SINGLETONS.RECEIVER).toBeDefined();
    expect(CONDITION_SINGLETONS.ALWAYS_TRUE).toBeDefined();
  });

  it('should be valid addresses', () => {
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    expect(CONDITION_SINGLETONS.PAYER).toMatch(addressRegex);
    expect(CONDITION_SINGLETONS.RECEIVER).toMatch(addressRegex);
    expect(CONDITION_SINGLETONS.ALWAYS_TRUE).toMatch(addressRegex);
  });
});

describe('ConditionAddress type', () => {
  it('should accept valid addresses', () => {
    const addr: ConditionAddress = '0x1234567890123456789012345678901234567890';
    expect(addr).toBe('0x1234567890123456789012345678901234567890');
  });
});

describe('conditions builder', () => {
  describe('conditions.PAYER', () => {
    it('should return PAYER singleton address', () => {
      expect(conditions.PAYER).toBe(CONDITION_SINGLETONS.PAYER);
    });
  });

  describe('conditions.RECEIVER', () => {
    it('should return RECEIVER singleton address', () => {
      expect(conditions.RECEIVER).toBe(CONDITION_SINGLETONS.RECEIVER);
    });
  });

  describe('conditions.ALWAYS_TRUE', () => {
    it('should return ALWAYS_TRUE singleton address', () => {
      expect(conditions.ALWAYS_TRUE).toBe(CONDITION_SINGLETONS.ALWAYS_TRUE);
    });
  });

  describe('conditions.and', () => {
    it('should create AND condition config', () => {
      const conditionA: ConditionAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const conditionB: ConditionAddress = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

      const result = conditions.and([conditionA, conditionB]);

      expect(result.type).toBe('and');
      expect(result.conditions).toHaveLength(2);
      expect(result.conditions).toContain(conditionA);
      expect(result.conditions).toContain(conditionB);
    });

    it('should support multiple conditions', () => {
      const result = conditions.and([
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as ConditionAddress,
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as ConditionAddress,
        '0xcccccccccccccccccccccccccccccccccccccccc' as ConditionAddress,
      ]);

      expect(result.conditions).toHaveLength(3);
    });
  });

  describe('conditions.or', () => {
    it('should create OR condition config', () => {
      const conditionA: ConditionAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const conditionB: ConditionAddress = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

      const result = conditions.or([conditionA, conditionB]);

      expect(result.type).toBe('or');
      expect(result.conditions).toHaveLength(2);
    });
  });

  describe('conditions.not', () => {
    it('should create NOT condition config', () => {
      const conditionA: ConditionAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      const result = conditions.not(conditionA);

      expect(result.type).toBe('not');
      expect(result.condition).toBe(conditionA);
    });
  });

  describe('conditions.staticAddress', () => {
    it('should create StaticAddressCondition config', () => {
      const designatedAddress = '0x1234567890123456789012345678901234567890' as const;

      const result = conditions.staticAddress(designatedAddress);

      expect(result.type).toBe('staticAddress');
      expect(result.designatedAddress).toBe(designatedAddress);
    });
  });

  describe('condition composition', () => {
    it('should support nested conditions', () => {
      // Example: receiver OR (payer AND arbiter)
      const arbiterCondition: ConditionAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      const innerAnd = conditions.and([conditions.PAYER, arbiterCondition]);
      const outerOr = conditions.or([conditions.RECEIVER, innerAnd]);

      expect(outerOr.type).toBe('or');
      expect(outerOr.conditions).toHaveLength(2);
      expect(outerOr.conditions[0]).toBe(conditions.RECEIVER);
      expect((outerOr.conditions[1] as typeof innerAnd).type).toBe('and');
    });
  });
});
