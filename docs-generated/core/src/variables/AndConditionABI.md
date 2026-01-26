[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / AndConditionABI

# Variable: AndConditionABI

> `const` **AndConditionABI**: readonly \[\{ `inputs`: readonly \[\{ `components`: readonly \[\{ `name`: `"operator"`; `type`: `"address"`; \}, \{ `name`: `"payer"`; `type`: `"address"`; \}, \{ `name`: `"receiver"`; `type`: `"address"`; \}, \{ `name`: `"token"`; `type`: `"address"`; \}, \{ `name`: `"maxAmount"`; `type`: `"uint120"`; \}, \{ `name`: `"preApprovalExpiry"`; `type`: `"uint48"`; \}, \{ `name`: `"authorizationExpiry"`; `type`: `"uint48"`; \}, \{ `name`: `"refundExpiry"`; `type`: `"uint48"`; \}, \{ `name`: `"minFeeBps"`; `type`: `"uint16"`; \}, \{ `name`: `"maxFeeBps"`; `type`: `"uint16"`; \}, \{ `name`: `"feeReceiver"`; `type`: `"address"`; \}, \{ `name`: `"salt"`; `type`: `"uint256"`; \}\]; `name`: `"paymentInfo"`; `type`: `"tuple"`; \}, \{ `name`: `"caller"`; `type`: `"address"`; \}\]; `name`: `"check"`; `outputs`: readonly \[\{ `name`: `"allowed"`; `type`: `"bool"`; \}\]; `stateMutability`: `"view"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\{ `name`: `""`; `type`: `"uint256"`; \}\]; `name`: `"conditions"`; `outputs`: readonly \[\{ `name`: `""`; `type`: `"address"`; \}\]; `stateMutability`: `"view"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\]; `name`: `"conditionCount"`; `outputs`: readonly \[\{ `name`: `""`; `type`: `"uint256"`; \}\]; `stateMutability`: `"view"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\]; `name`: `"MAX_CONDITIONS"`; `outputs`: readonly \[\{ `name`: `""`; `type`: `"uint256"`; \}\]; `stateMutability`: `"view"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\]; `name`: `"NoConditions"`; `type`: `"error"`; \}, \{ `inputs`: readonly \[\]; `name`: `"TooManyConditions"`; `type`: `"error"`; \}\]

Defined in: [core/src/conditions/index.ts:226](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/conditions/index.ts#L226)

AndCondition ABI
