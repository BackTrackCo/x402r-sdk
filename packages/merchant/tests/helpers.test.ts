import { describe, it, expect } from 'vitest';
import { refundable, withRefund } from '../src/helpers.js';

describe('Server Helpers', () => {
  describe('refundable', () => {
    it('should add operator address to payment option', () => {
      const option = {
        scheme: 'evm' as const,
        network: 'base-sepolia',
        token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        maxAmountRequired: '1000000',
        resource: 'https://example.com/api',
      };

      const operatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const result = refundable(option, operatorAddress);

      expect(result.x402r).toBeDefined();
      expect(result.x402r?.operator).toBe(operatorAddress);
    });

    it('should preserve existing option properties', () => {
      const option = {
        scheme: 'evm' as const,
        network: 'base-sepolia',
        token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        maxAmountRequired: '1000000',
        resource: 'https://example.com/api',
        description: 'Test payment',
      };

      const operatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const result = refundable(option, operatorAddress);

      expect(result.scheme).toBe(option.scheme);
      expect(result.network).toBe(option.network);
      expect(result.token).toBe(option.token);
      expect(result.maxAmountRequired).toBe(option.maxAmountRequired);
      expect(result.resource).toBe(option.resource);
      expect(result.description).toBe(option.description);
    });

    it('should allow specifying escrow period', () => {
      const option = {
        scheme: 'evm' as const,
        network: 'base-sepolia',
        token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        maxAmountRequired: '1000000',
        resource: 'https://example.com/api',
      };

      const operatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const escrowPeriod = 86400; // 24 hours in seconds
      const result = refundable(option, operatorAddress, { escrowPeriod });

      expect(result.x402r?.escrowPeriod).toBe(escrowPeriod);
    });

    it('should allow specifying refund request address', () => {
      const option = {
        scheme: 'evm' as const,
        network: 'base-sepolia',
        token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        maxAmountRequired: '1000000',
        resource: 'https://example.com/api',
      };

      const operatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const refundRequestAddress = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const result = refundable(option, operatorAddress, { refundRequestAddress });

      expect(result.x402r?.refundRequestAddress).toBe(refundRequestAddress);
    });
  });

  describe('withRefund', () => {
    it('should add x402r metadata to all routes', () => {
      const routes = {
        '/api/resource': {
          paymentOptions: [
            {
              scheme: 'evm' as const,
              network: 'base-sepolia',
              token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
              maxAmountRequired: '1000000',
              resource: '/api/resource',
            },
          ],
        },
      };

      const operatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const result = withRefund(routes, operatorAddress);

      expect(result['/api/resource'].paymentOptions[0].x402r).toBeDefined();
      expect(result['/api/resource'].paymentOptions[0].x402r?.operator).toBe(operatorAddress);
    });

    it('should handle multiple routes', () => {
      const routes = {
        '/api/resource1': {
          paymentOptions: [
            {
              scheme: 'evm' as const,
              network: 'base-sepolia',
              token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
              maxAmountRequired: '500000',
              resource: '/api/resource1',
            },
          ],
        },
        '/api/resource2': {
          paymentOptions: [
            {
              scheme: 'evm' as const,
              network: 'base-sepolia',
              token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
              maxAmountRequired: '1000000',
              resource: '/api/resource2',
            },
          ],
        },
      };

      const operatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const result = withRefund(routes, operatorAddress);

      expect(result['/api/resource1'].paymentOptions[0].x402r?.operator).toBe(operatorAddress);
      expect(result['/api/resource2'].paymentOptions[0].x402r?.operator).toBe(operatorAddress);
    });

    it('should handle routes with multiple payment options', () => {
      const routes = {
        '/api/resource': {
          paymentOptions: [
            {
              scheme: 'evm' as const,
              network: 'base-sepolia',
              token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
              maxAmountRequired: '1000000',
              resource: '/api/resource',
            },
            {
              scheme: 'evm' as const,
              network: 'base-mainnet',
              token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
              maxAmountRequired: '1000000',
              resource: '/api/resource',
            },
          ],
        },
      };

      const operatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const result = withRefund(routes, operatorAddress);

      expect(result['/api/resource'].paymentOptions).toHaveLength(2);
      expect(result['/api/resource'].paymentOptions[0].x402r?.operator).toBe(operatorAddress);
      expect(result['/api/resource'].paymentOptions[1].x402r?.operator).toBe(operatorAddress);
    });

    it('should pass through options to refundable', () => {
      const routes = {
        '/api/resource': {
          paymentOptions: [
            {
              scheme: 'evm' as const,
              network: 'base-sepolia',
              token: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
              maxAmountRequired: '1000000',
              resource: '/api/resource',
            },
          ],
        },
      };

      const operatorAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const escrowPeriod = 86400;
      const result = withRefund(routes, operatorAddress, { escrowPeriod });

      expect(result['/api/resource'].paymentOptions[0].x402r?.escrowPeriod).toBe(escrowPeriod);
    });
  });
});
