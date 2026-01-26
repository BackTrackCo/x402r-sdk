[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / StaticAddressConditionABI

# Variable: StaticAddressConditionABI

> `const` **StaticAddressConditionABI**: readonly \[\{ `inputs`: readonly \[\{ `components`: readonly \[\{ `name`: `"operator"`; `type`: `"address"`; \}, \{ `name`: `"payer"`; `type`: `"address"`; \}, \{ `name`: `"receiver"`; `type`: `"address"`; \}, \{ `name`: `"token"`; `type`: `"address"`; \}, \{ `name`: `"maxAmount"`; `type`: `"uint120"`; \}, \{ `name`: `"preApprovalExpiry"`; `type`: `"uint48"`; \}, \{ `name`: `"authorizationExpiry"`; `type`: `"uint48"`; \}, \{ `name`: `"refundExpiry"`; `type`: `"uint48"`; \}, \{ `name`: `"minFeeBps"`; `type`: `"uint16"`; \}, \{ `name`: `"maxFeeBps"`; `type`: `"uint16"`; \}, \{ `name`: `"feeReceiver"`; `type`: `"address"`; \}, \{ `name`: `"salt"`; `type`: `"uint256"`; \}\]; `name`: `"paymentInfo"`; `type`: `"tuple"`; \}, \{ `name`: `"caller"`; `type`: `"address"`; \}\]; `name`: `"check"`; `outputs`: readonly \[\{ `name`: `""`; `type`: `"bool"`; \}\]; `stateMutability`: `"view"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\]; `name`: `"DESIGNATED_ADDRESS"`; `outputs`: readonly \[\{ `name`: `""`; `type`: `"address"`; \}\]; `stateMutability`: `"view"`; `type`: `"function"`; \}\]

Defined in: [core/src/abis/index.ts:473](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/abis/index.ts#L473)

StaticAddressCondition ABI - Condition that checks for a specific address
