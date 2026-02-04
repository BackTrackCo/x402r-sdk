# Operator Deployment Guide

This guide explains how to deploy a PaymentOperator using the x402r SDK.

## Overview

A **PaymentOperator** is the core contract that handles payment flows in x402r:
- **Authorize**: Lock funds in escrow
- **Release**: Transfer escrowed funds to merchant after conditions are met
- **Refund**: Return funds to payer (during or after escrow)
- **Charge**: Immediate payment without escrow

Each operator is configured with **conditions** (access control) and **recorders** (state tracking) across 10 slots.

## Architecture

```
PaymentOperator
├── 5 Condition Slots (checked BEFORE action)
│   ├── AUTHORIZE_CONDITION   → Who can authorize payments
│   ├── CHARGE_CONDITION      → Who can charge immediately
│   ├── RELEASE_CONDITION     → Who can release escrowed funds
│   ├── REFUND_IN_ESCROW_CONDITION    → Who can refund during escrow
│   └── REFUND_POST_ESCROW_CONDITION  → Who can refund after escrow
│
├── 5 Recorder Slots (called AFTER action succeeds)
│   ├── AUTHORIZE_RECORDER    → Record authorization (e.g., timestamp)
│   ├── CHARGE_RECORDER       → Record charge
│   ├── RELEASE_RECORDER      → Record release
│   ├── REFUND_IN_ESCROW_RECORDER     → Record in-escrow refund
│   └── REFUND_POST_ESCROW_RECORDER   → Record post-escrow refund
│
└── Fee Configuration
    ├── FEE_RECIPIENT         → Receives operator's fee share
    ├── FEE_CALCULATOR        → Calculates operator fee (optional)
    └── PROTOCOL_FEE_CONFIG   → Protocol-level fee configuration
```

### Default Behavior

- `address(0)` for a **condition** = always allow
- `address(0)` for a **recorder** = no-op (don't record anything)

## Quick Start

### Prerequisites

```bash
# Install dependencies
cd x402r-sdk
pnpm install
pnpm build
```

### Deploy a Marketplace Operator

The SDK provides a high-level preset for common marketplace scenarios:

```typescript
import { createWalletClient, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { deployMarketplaceOperator } from '@x402r/core';

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
});

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const result = await deployMarketplaceOperator(
  walletClient,
  publicClient,
  'eip155:84532',  // Base Sepolia
  {
    feeRecipient: account.address,      // Receives operator fees
    arbiter: '0x...',                   // Dispute resolution address
    escrowPeriodSeconds: 604800n,       // 7 days
    operatorFeeBps: 100n,               // 1% operator fee (optional)
  }
);

console.log('Operator:', result.operatorAddress);
console.log('EscrowPeriod:', result.escrowPeriodAddress);
console.log('Freeze:', result.freezeAddress);
```

### What Gets Deployed

The `deployMarketplaceOperator()` preset deploys:

| Contract | Purpose |
|----------|---------|
| **EscrowPeriod** | Records authorization time, enforces escrow period |
| **FreezePolicy** | Defines who can freeze (payer) and unfreeze (receiver) |
| **Freeze** | Manages payment freezing during escrow |
| **StaticAddressCondition** | Arbiter access for refund approval |
| **OrCondition** | Combines receiver + arbiter for refund-in-escrow |
| **StaticFeeCalculator** | Operator fee calculation (if feeBps > 0) |
| **PaymentOperator** | The main operator contract |

### Slot Configuration

The marketplace preset configures slots as:

| Slot | Value | Meaning |
|------|-------|---------|
| `authorizeCondition` | UsdcTvlLimit | Safety limit on total USDC |
| `authorizeRecorder` | EscrowPeriod | Records authorization timestamp |
| `releaseCondition` | EscrowPeriod | Only release after escrow period |
| `refundInEscrowCondition` | OR(Receiver, Arbiter) | Receiver or arbiter can refund |
| `refundPostEscrowCondition` | Receiver | Only receiver after escrow |

## Low-Level Deployment

For custom configurations, use the factory wrappers directly:

### Deploy Individual Contracts

```typescript
import {
  deployEscrowPeriod,
  deployFreezePolicy,
  deployFreeze,
  deployStaticAddressCondition,
  deployStaticFeeCalculator,
  deployAndCondition,
  deployOrCondition,
  deployOperator,
  getNetworkConfig,
} from '@x402r/core';

const networkId = 'eip155:84532';
const config = getNetworkConfig(networkId);

// 1. Deploy EscrowPeriod (recorder + condition)
const escrowPeriod = await deployEscrowPeriod(
  walletClient,
  publicClient,
  networkId,
  {
    escrowPeriodSeconds: 604800n,  // 7 days
    authorizedCodehash: config.operatorCodehash,
  }
);

// 2. Deploy FreezePolicy
const freezePolicy = await deployFreezePolicy(
  walletClient,
  publicClient,
  networkId,
  {
    freezeCondition: config.conditions.payer,     // Payer can freeze
    unfreezeCondition: config.conditions.receiver, // Receiver can unfreeze
    freezeDuration: 0n,  // Permanent until unfrozen
  }
);

// 3. Deploy Freeze
const freeze = await deployFreeze(
  walletClient,
  publicClient,
  networkId,
  {
    freezePolicy,
    escrowPeriodContract: escrowPeriod,
  }
);

// 4. Deploy arbiter condition
const arbiterCondition = await deployStaticAddressCondition(
  walletClient,
  publicClient,
  networkId,
  arbiterAddress
);

// 5. Combine conditions with OR
const refundCondition = await deployOrCondition(
  walletClient,
  publicClient,
  networkId,
  [config.conditions.receiver, arbiterCondition]
);

// 6. Deploy operator
const operator = await deployOperator(
  walletClient,
  publicClient,
  networkId,
  {
    escrow: config.escrow,
    protocolFeeConfig: config.protocolFeeConfig,
    feeRecipient: feeRecipientAddress,
    feeCalculator: '0x0000000000000000000000000000000000000000',
    authorizeCondition: config.usdcTvlLimit,
    chargeCondition: '0x0000000000000000000000000000000000000000',
    releaseCondition: escrowPeriod,
    refundInEscrowCondition: refundCondition,
    refundPostEscrowCondition: config.conditions.receiver,
    authorizeRecorder: escrowPeriod,
    chargeRecorder: '0x0000000000000000000000000000000000000000',
    releaseRecorder: '0x0000000000000000000000000000000000000000',
    refundInEscrowRecorder: '0x0000000000000000000000000000000000000000',
    refundPostEscrowRecorder: '0x0000000000000000000000000000000000000000',
  }
);
```

### Using Condition Configs

Build complex conditions declaratively with `resolveConditionConfig()`:

```typescript
import { resolveConditionConfig, getNetworkConfig } from '@x402r/core';

const config = getNetworkConfig('eip155:84532');

// Deploy a complex condition: (Payer AND Arbiter) OR Receiver
const complexCondition = await resolveConditionConfig(
  walletClient,
  publicClient,
  'eip155:84532',
  {
    type: 'or',
    conditions: [
      {
        type: 'and',
        conditions: [
          config.conditions.payer,
          { type: 'staticAddress', designatedAddress: arbiterAddress },
        ],
      },
      config.conditions.receiver,
    ],
  }
);
```

## Fee Calculation

Fees are **additive**: Total = Protocol Fee + Operator Fee

- **Protocol Fee**: 0-100 bps, managed by `ProtocolFeeConfig` with 7-day timelock
- **Operator Fee**: Set at deployment via `StaticFeeCalculator`, immutable

```typescript
import { calculateTotalFees, formatFeeBreakdown, validateFeeBounds } from '@x402r/core';

const fees = await calculateTotalFees(
  publicClient,
  operatorAddress,
  paymentInfo,
  10_000_000n,  // 10 USDC
  callerAddress
);

console.log(formatFeeBreakdown(fees));
// Fee Breakdown:
//   Protocol Fee: 50 bps (0.50%) = 0.050000 USDC
//   Operator Fee: 100 bps (1.00%) = 0.100000 USDC
//   Total Fee:    150 bps (1.50%) = 0.150000 USDC
//   Net Amount:   9.850000 USDC

// Validate fees are within payment bounds
const isValid = validateFeeBounds(fees, paymentInfo);
```

| Function | Purpose |
|----------|---------|
| `calculateTotalFees()` | Full fee breakdown (protocol + operator) |
| `calculateOperatorFeeBps()` | Operator fee in basis points |
| `calculateProtocolFeeBps()` | Protocol fee in basis points |
| `getFeeAddresses()` | Fee calculator and recipient addresses |
| `validateFeeBounds()` | Check fees are within payment bounds |
| `formatFeeBreakdown()` | Human-readable fee string |

## Available Conditions

### Singleton Conditions (Pre-deployed)

These are deployed once per network and reused:

| Condition | Address (Base Sepolia) | Purpose |
|-----------|------------------------|---------|
| `PayerCondition` | `0xBAF68176...` | Caller must be payer |
| `ReceiverCondition` | `0x12EDefd4...` | Caller must be receiver |
| `AlwaysTrueCondition` | `0x785cC83D...` | Always allows |

Access via `getNetworkConfig(networkId).conditions.*`

### Factory-Deployed Conditions

| Condition | Factory | Purpose |
|-----------|---------|---------|
| `StaticAddressCondition` | `StaticAddressConditionFactory` | Caller must be specific address |
| `AndCondition` | `AndConditionFactory` | All child conditions must pass |
| `OrCondition` | `OrConditionFactory` | Any child condition must pass |
| `NotCondition` | `NotConditionFactory` | Inverts child condition |

### Special Conditions

| Condition | Purpose |
|-----------|---------|
| `EscrowPeriod` | Time-based: passes after escrow period expires |
| `Freeze` | Freeze-based: fails if payment is frozen |
| `UsdcTvlLimit` | Safety: limits total USDC in escrow |

## Network Configuration

The SDK includes addresses for deployed contracts:

```typescript
import { getNetworkConfig } from '@x402r/core';

const config = getNetworkConfig('eip155:84532');  // Base Sepolia
// or
const config = getNetworkConfig('eip155:8453');   // Base Mainnet

console.log(config.escrow);              // AuthCaptureEscrow address
console.log(config.protocolFeeConfig);   // ProtocolFeeConfig address
console.log(config.factories.operator);  // PaymentOperatorFactory address
console.log(config.conditions.payer);    // PayerCondition singleton
```

## Testing Your Deployment

### 1. Run the Example Script

```bash
cd x402r-sdk

# Deploy an operator (requires PRIVATE_KEY env var)
PRIVATE_KEY=0x... pnpm example:deploy-operator
```

### 2. Verify on Block Explorer

After deployment, verify your contracts on BaseScan:
- Base Sepolia: https://sepolia.basescan.org
- Base Mainnet: https://basescan.org

### 3. Test Payment Flow

```typescript
import { X402rClient } from '@x402r/client';
import { X402rMerchant } from '@x402r/merchant';

// As payer
const client = new X402rClient({
  publicClient,
  walletClient: payerWallet,
  operatorAddress: result.operatorAddress,
});

// Check if payment can be frozen
const frozen = await client.isFrozen(paymentInfo, result.freezeAddress);

// As merchant
const merchant = new X402rMerchant({
  publicClient,
  walletClient: merchantWallet,
  operatorAddress: result.operatorAddress,
});

// Release after escrow period
await merchant.release(paymentInfo, amount);
```

## Common Patterns

### Marketplace with Dispute Resolution

```typescript
// 7-day escrow, payer can freeze, arbiter resolves disputes
const result = await deployMarketplaceOperator(walletClient, publicClient, networkId, {
  feeRecipient: merchantAddress,
  arbiter: arbiterAddress,
  escrowPeriodSeconds: 604800n,  // 7 days
  operatorFeeBps: 100n,          // 1%
});
```

### Subscription Service

```typescript
// No escrow period, immediate charges
const operator = await deployOperator(walletClient, publicClient, networkId, {
  // ... base config
  authorizeCondition: config.usdcTvlLimit,
  chargeCondition: config.conditions.receiver,  // Merchant can charge
  releaseCondition: config.conditions.alwaysTrue,  // No escrow
  refundInEscrowCondition: config.conditions.receiver,
  refundPostEscrowCondition: config.conditions.receiver,
  authorizeRecorder: '0x0000000000000000000000000000000000000000',  // No timestamp needed
  // ... other recorders as 0x0
});
```

### High-Security with Multi-Sig

```typescript
// Require both arbiter AND receiver for release
const releaseCondition = await deployAndCondition(
  walletClient, publicClient, networkId,
  [arbiterCondition, config.conditions.receiver]
);
```

## Troubleshooting

### InvalidFeeReceiver Error

When calling `authorize()`, ensure `paymentInfo.feeReceiver` equals the operator address:

```typescript
const paymentInfo = {
  operator: operatorAddress,
  // ... other fields
  feeReceiver: operatorAddress,  // MUST equal operator!
};
```

### Condition Check Failed

Use the condition's `check()` function to debug:

```typescript
const allowed = await publicClient.readContract({
  address: conditionAddress,
  abi: IConditionABI,
  functionName: 'check',
  args: [paymentInfo, amount, callerAddress],
});
console.log('Condition allows:', allowed);
```

### Transaction Reverted

Check the escrow state:

```typescript
const state = await publicClient.readContract({
  address: config.escrow,
  abi: AuthCaptureEscrowABI,
  functionName: 'paymentState',
  args: [paymentInfoHash],
});
console.log('Capturable:', state.capturableAmount);
console.log('Refundable:', state.refundableAmount);
```

## API Reference

See the [TypeDoc API Reference](https://backtrackco.github.io/x402r-sdk) for complete documentation.
