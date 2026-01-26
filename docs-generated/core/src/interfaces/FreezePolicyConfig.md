[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / FreezePolicyConfig

# Interface: FreezePolicyConfig

Defined in: [core/src/factory/index.ts:141](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L141)

Configuration for deploying a FreezePolicy

## Properties

### freezeCondition

> **freezeCondition**: `` `0x${string}` ``

Defined in: [core/src/factory/index.ts:143](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L143)

Condition that authorizes freeze calls

***

### freezeDuration

> **freezeDuration**: `bigint`

Defined in: [core/src/factory/index.ts:147](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L147)

Duration that freezes last (0 = permanent)

***

### unfreezeCondition

> **unfreezeCondition**: `` `0x${string}` ``

Defined in: [core/src/factory/index.ts:145](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L145)

Condition that authorizes unfreeze calls
