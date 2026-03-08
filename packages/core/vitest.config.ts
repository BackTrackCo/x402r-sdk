import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: process.env.CI ? ['lcov'] : ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/index.ts',
        'src/abis/**',
        'src/types/**',
        'tests/**',
        // Write actions — thin requireAccount + writeContract forwarding (no logic)
        'src/actions/operator/authorize.ts',
        'src/actions/operator/charge.ts',
        'src/actions/operator/release.ts',
        'src/actions/freeze/freezePayment.ts',
        'src/actions/freeze/unfreezePayment.ts',
        'src/actions/evidence/submitEvidence.ts',
        'src/actions/fees/distributeFees.ts',
        'src/actions/refund/requestRefund.ts',
        'src/actions/refund/cancelRefundRequest.ts',
        'src/actions/refund/denyRefundRequest.ts',
        'src/actions/refund/refuseRefundRequest.ts',
        'src/actions/refund/approveRefundWithSignature.ts',
        'src/actions/refund-budget/approveRefundBudget.ts',
        'src/actions/refund-budget/refundInEscrow.ts',
        'src/actions/refund-budget/refundPostEscrow.ts',
        // Pure readContract passthroughs — no mapping, direct return
        'src/actions/freeze/isFrozen.ts',
        'src/actions/refund-budget/getRefundBudget.ts',
        'src/actions/escrow/getAuthorizationTime.ts',
        'src/actions/escrow/getEscrowPeriodDuration.ts',
        'src/actions/escrow/isDuringEscrowPeriod.ts',
        'src/actions/refund/getRefundRequestStatus.ts',
        'src/actions/refund/hasRefundRequest.ts',
        'src/actions/refund/getCancelCount.ts',
        'src/actions/refund/getCancelledAmount.ts',
        'src/actions/refund/getStoredPaymentInfo.ts',
        'src/actions/fees/getAccumulatedProtocolFees.ts',
        // Typed wrappers — each function is a 1-line delegation to factory-helpers.ts (100% covered)
        'src/deploy/factories.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
    projects: [
      {
        test: {
          name: 'core',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/integration/**'],
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: 'core:fork',
          include: ['tests/integration/**/*.fork.test.ts'],
          globalSetup: ['tests/setup/globalSetup.ts'],
          testTimeout: 60_000,
          hookTimeout: 60_000,
          passWithNoTests: true,
          // Fork RPC (Alchemy) can be flaky — retry individual tests instead of restarting the suite
          retry: 3,
        },
      },
    ],
  },
})
