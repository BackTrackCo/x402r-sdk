import { defineConfig } from '@wagmi/cli'
import { foundry, foundryDefaultExcludes } from '@wagmi/cli/plugins'

export default defineConfig({
  out: 'packages/core/src/abis/generated.ts',
  plugins: [
    foundry({
      project: '../x402r-contracts',
      exclude: [
        ...foundryDefaultExcludes,

        // Test helpers and mocks
        'Mock*.sol/**',
        'AuthCaptureEscrow.sol/**',
        'MaliciousRecorder.sol/**',
        '*Invariants*/**',
        '*Handler*/**',

        // Internal access control
        '*Access.sol/**',

        // Internal Solidity types/errors/events
        'Errors.sol/**',
        'Events.sol/**',
        'Types.sol/**',

        // Abstract base contracts
        'BaseRecorder.sol/**',

        // External library contracts (commerce-payments, OZ, solady)
        'TokenCollector.sol/**',
        'TokenStore.sol/**',
        'PreApprovalPaymentCollector.sol/**',
        'ERC3009PaymentCollector.sol/**',
        'EIP712.sol/**',
        'ERC20.sol/**',
        'Ownable.sol/**',
        'LibClone.sol/**',
        'SafeERC20.sol/**',
        'SafeTransferLib.sol/**',
        'SignatureCheckerLib.sol/**',
        'ReentrancyGuardTransient.sol/**',
        'IERC1363.sol/**',
        'IERC3009.sol/**',
        'IMulticall3.sol/**',
        'ERC6492SignatureHandler.sol/**',
        'FreezePolicy.sol/**',
        'FreezePolicyFactory.sol/**',
        'IFreezePolicy.sol/**',
      ],
    }),
  ],
})
