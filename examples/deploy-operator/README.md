# Deploy Operator Example

Deploy a complete marketplace payment operator with escrow, freeze, and arbiter support.

## Prerequisites

- Node.js 20+
- Private key with Base Sepolia ETH (for gas)
- Get testnet ETH: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

## Usage

```bash
PRIVATE_KEY=0x... pnpm start
```

Or using tsx directly from the SDK root:
```bash
PRIVATE_KEY=0x... pnpm tsx examples/deploy-operator/index.ts
```

## What Gets Deployed

The script deploys a complete marketplace operator with:

| Contract | Purpose |
|----------|---------|
| **PaymentOperator** | Main entry point for payments |
| **EscrowPeriod** | Records authorization time, enforces escrow period |
| **Freeze** | Manages payment freezing (includes freeze/unfreeze conditions and duration) |
| **StaticAddressCondition** | Arbiter address condition |
| **OrCondition** | Combines receiver + arbiter for refund conditions |
| **StaticFeeCalculator** | Optional operator fee (if > 0%) |

### Condition Composition

The deployment script composes conditions for refund authorization:

- **RefundInEscrowCondition** = `OR(ReceiverCondition, ArbiterCondition)` — during the escrow period, either the merchant or the arbiter can approve refunds
- **RefundPostEscrowCondition** = `ReceiverCondition` — after escrow ends, only the merchant can approve refunds

This means disputes can be resolved by the arbiter while escrow is active, but once the escrow period passes, only the merchant retains refund authority.

## Default Configuration

```typescript
{
  feeRecipient: <your address>,     // Receives operator fees
  arbiter: <your address>,          // Self as arbiter (for testing)
  escrowPeriodSeconds: 604800n,     // 7 days
  freezeDurationSeconds: 259200n,   // 3 days max freeze
  operatorFeeBps: 100n,             // 1% operator fee
}
```

## Output

The script outputs:
1. Preview of deterministic addresses
2. Deployment progress
3. Summary of new vs existing deployments
4. All deployed addresses
5. Transaction hashes with BaseScan links

## Example Output

```
Deployer address: 0xE5e52c4EC4E58E3a31B2552B4a2B0d977Ec972ae
Balance: 0.1 ETH

--- Configuration ---
Fee recipient: 0xE5e52c4EC4E58E3a31B2552B4a2B0d977Ec972ae
Arbiter: 0xE5e52c4EC4E58E3a31B2552B4a2B0d977Ec972ae
Escrow period: 7 days
Freeze duration: 3 days
Operator fee: 1 %

--- Preview Addresses ---
Operator: 0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
EscrowPeriod: 0xFcFb7e197823D304D53F47BE1E9761e9D102589b
...

--- Deploying ---
Deployment completed in 45.2s

--- Deployment Summary ---
New deployments: 6
Already existed: 0
Transaction count: 6

--- Deployed Addresses ---
PaymentOperator: 0xbb4f390b80E4F4895B96B95AE382B65fDC45974B
EscrowPeriod: 0xFcFb7e197823D304D53F47BE1E9761e9D102589b
Freeze: 0xD0f99B7667076f151FD8240b277f1765d147e48C
...
```

## Next Steps

After deployment:

1. **Configure merchant server:**
   ```bash
   cd ../merchant-server
   cp .env.example .env
   # Add the deployed addresses to .env
   ```

2. **Test the payment flow:**
   ```bash
   # Start merchant
   cd ../merchant-server && pnpm start

   # Make payment
   cd ../client-cli && pnpm start pay --url http://localhost:3000/weather
   ```

## Customization

To customize the operator, edit `index.ts`:

```typescript
const options = {
  feeRecipient: '0x...custom_address...',
  arbiter: '0x...arbiter_address...',
  escrowPeriodSeconds: 86400n,      // 1 day
  freezeDurationSeconds: 0n,         // No freeze limit
  operatorFeeBps: 50n,               // 0.5% fee
};
```

## Deterministic Addresses

All contracts are deployed via CREATE2 factories, so the same configuration always produces the same addresses. Running the script twice with identical config will detect existing contracts and skip deployment.
