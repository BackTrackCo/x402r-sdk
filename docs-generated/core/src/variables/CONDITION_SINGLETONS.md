[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / CONDITION\_SINGLETONS

# Variable: CONDITION\_SINGLETONS

> `const` **CONDITION\_SINGLETONS**: `object`

Defined in: [core/src/conditions/index.ts:68](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/conditions/index.ts#L68)

Deployed singleton condition addresses
These are deployed once and can be reused across all operators

## Type Declaration

### ALWAYS\_TRUE

> `readonly` **ALWAYS\_TRUE**: `` `0x${string}` ``

AlwaysTrueCondition singleton - always returns true

### PAYER

> `readonly` **PAYER**: `` `0x${string}` ``

PayerCondition singleton - checks if caller is the payer

### RECEIVER

> `readonly` **RECEIVER**: `` `0x${string}` ``

ReceiverCondition singleton - checks if caller is the receiver

## Remarks

These addresses are placeholders and will be updated with real
deployed addresses on each network. Use with NETWORK_CONFIG
for network-specific addresses.
