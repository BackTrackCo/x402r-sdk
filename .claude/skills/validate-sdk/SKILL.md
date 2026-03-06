# Validate SDK Skill

Validates that the `@x402r/core` SDK is in sync with the on-chain contracts.

## When to Run

After modifying ABIs, config, operations, or types in `packages/core/src/`.

## Checklist

### 1. Struct Validation

Verify `PaymentInfo` type in `src/types/index.ts` matches the contract struct (12 fields):

| Field | Solidity Type |
|-------|--------------|
| operator | address |
| payer | address |
| receiver | address |
| token | address |
| maxAmount | uint120 |
| preApprovalExpiry | uint48 |
| authorizationExpiry | uint48 |
| refundExpiry | uint48 |
| minFeeBps | uint16 |
| maxFeeBps | uint16 |
| feeReceiver | address |
| salt | uint256 |

Source: `src/abis/generated.ts` — any function taking `PaymentInfo` tuple (e.g., `authorize`).

Also verify `AuthorizedFees` struct exists in the ABI: `{ totalFeeBps: uint16, protocolFeeBps: uint16 }`.

### 2. ABI Drift Check

```bash
cd x402r-sdk
pnpm generate:abis
git diff packages/core/src/abis/generated.ts
# If diff -> ABIs are stale, commit the update
```

### 3. Factory ABIs

Verify these factories exist in `src/abis/generated.ts`:
- `paymentOperatorFactoryAbi`
- `escrowPeriodFactoryAbi`
- `freezeFactoryAbi`
- `staticFeeCalculatorFactoryAbi`
- `staticAddressConditionFactoryAbi`
- `andConditionFactoryAbi`
- `orConditionFactoryAbi`
- `notConditionFactoryAbi`
- `recorderCombinatorFactoryAbi`

### 4. Contract ABIs

Verify these contract ABIs exist in `src/abis/generated.ts`:
- `paymentOperatorAbi` — functions: `authorize`, `charge`, `release`, `refundInEscrow`, `refundPostEscrow`, `distributeFees`
- `signatureRefundRequestAbi` — functions: `requestRefund`, `approveRefundRequest`, `denyRefundRequest`, `cancelRefundRequest`, `refuseRefundRequest`, `getRequest`, `getRequestStatus`
- `freezeAbi` — functions: `freeze`, `unfreeze`, `isFrozen`
- `escrowPeriodAbi` — functions: `getAuthorizationTime`, `isDuringEscrowPeriod`, `ESCROW_PERIOD`
- `refundRequestEvidenceAbi` — functions: `submitEvidence`, `getEvidence`, `getEvidenceCount`, `getEvidenceBatch`
- `signatureConditionAbi` — functions: `approveRefund`
- `protocolFeeConfigAbi` — functions: `calculateProtocolFee`, `calculateOperatorFee`

Also verify `src/abis/escrow.ts` — manually defined `paymentState` ABI returns `(bool, uint256, uint256)`.

### 5. Address Validation

Verify `src/config/index.ts`:
- `x402rChains` has 10 chain configs (84532, 8453, 11155111, 1, 137, 42161, 42220, 143, 10, 43114)
- Each config implements `X402rChainConfig` interface
- Base Sepolia (84532) has full `factories` and `conditions` objects
- All addresses are checksummed `0x...` format

### 6. Operations Coverage

Verify `src/operations/index.ts` exports cover all payment flows:

| Operation | File |
|-----------|------|
| authorize, charge, release | operator-writes.ts |
| getPaymentState, getPaymentAmounts | payment-state.ts |
| getOperatorConfig, getEscrowAddress, getConditionAddress | operator.ts |
| calculateTotalFees, getFeeAddresses, distributeFees, validateFeeBounds | fees.ts |
| isFrozen | freeze-reads.ts |
| freezePayment, unfreezePayment | freeze-writes.ts |
| refundInEscrow, refundPostEscrow, approveRefundBudget | refund-budget-writes.ts |
| getRefundBudget | refund-budget-reads.ts |
| requestRefund, denyRefundRequest, cancelRefundRequest, approveRefundWithSignature | refund-writes.ts |
| getRefundRequestStatus, hasRefundRequest, RefundRequestStatus | refund-reads.ts |
| submitEvidence, getEvidence, getEvidenceCount, getEvidenceBatch | evidence.ts |

### 7. Enum Validation

**RefundRequestStatus** (in `src/operations/refund-reads.ts`):
| Name | Value |
|------|-------|
| Pending | 0 |
| Approved | 1 |
| Denied | 2 |
| Cancelled | 3 |
| Refused | 4 |

**PaymentState**: No enum — uses raw `(bool, uint256, uint256)` tuple from escrow contract, mapped to `PaymentAmounts` interface.

### 8. Build & Test Gate

```bash
cd x402r-sdk
pnpm build
pnpm typecheck
pnpm --filter=@x402r/core test:unit
pnpm --filter=@x402r/core test:cov  # coverage >= 85%
```
