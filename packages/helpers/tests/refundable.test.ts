import { describe, it, expect } from 'vitest';
import { refundable } from '../src/index.js';

describe('refundable', () => {
  const baseOption = {
    scheme: 'escrow',
    network: 'eip155:84532',
    payTo: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    price: '$0.01',
  };

  it('populates extra with network config addresses', () => {
    const result = refundable(
      baseOption,
      '0xABCDEF1234567890123456789012345678901234' as `0x${string}`,
    );

    expect(result.extra.escrowAddress).toBe(
      '0xb9488351E48b23D798f24e8174514F28B741Eb4f',
    );
    expect(result.extra.operatorAddress).toBe(
      '0xABCDEF1234567890123456789012345678901234',
    );
    expect(result.extra.tokenCollector).toBe(
      '0xed02d3E5167BCc9582D851885A89b050AB816a56',
    );
  });

  it('preserves existing option properties', () => {
    const result = refundable(
      baseOption,
      '0xABCDEF1234567890123456789012345678901234' as `0x${string}`,
    );

    expect(result.scheme).toBe('escrow');
    expect(result.network).toBe('eip155:84532');
    expect(result.payTo).toBe(baseOption.payTo);
    expect(result.price).toBe('$0.01');
  });

  it('allows escrowPeriod override', () => {
    const result = refundable(
      baseOption,
      '0xABCDEF1234567890123456789012345678901234' as `0x${string}`,
      { escrowPeriod: 86400 },
    );

    expect(result.extra.refundExpirySeconds).toBe(86400);
  });

  it('allows address overrides', () => {
    const result = refundable(
      baseOption,
      '0xABCDEF1234567890123456789012345678901234' as `0x${string}`,
      {
        escrowAddress:
          '0xCustomEscrow12345678901234567890123456' as `0x${string}`,
        tokenCollector:
          '0xCustomCollector234567890123456789012' as `0x${string}`,
      },
    );

    expect(result.extra.escrowAddress).toBe(
      '0xCustomEscrow12345678901234567890123456',
    );
    expect(result.extra.tokenCollector).toBe(
      '0xCustomCollector234567890123456789012',
    );
  });

  it('throws for unsupported network', () => {
    const badOption = { ...baseOption, network: 'eip155:99999' };

    expect(() =>
      refundable(
        badOption,
        '0xABCDEF1234567890123456789012345678901234' as `0x${string}`,
      ),
    ).toThrow('Unsupported network');
  });

  it('adds token name and version', () => {
    const result = refundable(
      baseOption,
      '0xABCDEF1234567890123456789012345678901234' as `0x${string}`,
      { tokenName: 'USDC', tokenVersion: '2' },
    );

    expect(result.extra.name).toBe('USDC');
    expect(result.extra.version).toBe('2');
  });

  it('merges with existing extra fields', () => {
    const optionWithExtra = {
      ...baseOption,
      extra: { customField: 'value' },
    };

    const result = refundable(
      optionWithExtra,
      '0xABCDEF1234567890123456789012345678901234' as `0x${string}`,
    );

    expect(result.extra.customField).toBe('value');
    expect(result.extra.operatorAddress).toBeDefined();
  });
});
