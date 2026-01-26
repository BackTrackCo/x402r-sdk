[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / EscrowPeriodConditionFactoryABI

# Variable: EscrowPeriodConditionFactoryABI

> `const` **EscrowPeriodConditionFactoryABI**: readonly \[\{ `inputs`: readonly \[\{ `name`: `"escrowPeriod"`; `type`: `"uint256"`; \}, \{ `name`: `"freezePolicy"`; `type`: `"address"`; \}\]; `name`: `"computeAddresses"`; `outputs`: readonly \[\{ `name`: `"recorder"`; `type`: `"address"`; \}, \{ `name`: `"condition"`; `type`: `"address"`; \}\]; `stateMutability`: `"view"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\{ `name`: `"escrowPeriod"`; `type`: `"uint256"`; \}, \{ `name`: `"freezePolicy"`; `type`: `"address"`; \}\]; `name`: `"getDeployed"`; `outputs`: readonly \[\{ `name`: `"recorder"`; `type`: `"address"`; \}, \{ `name`: `"condition"`; `type`: `"address"`; \}\]; `stateMutability`: `"view"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\{ `name`: `"escrowPeriod"`; `type`: `"uint256"`; \}, \{ `name`: `"freezePolicy"`; `type`: `"address"`; \}\]; `name`: `"getKey"`; `outputs`: readonly \[\{ `name`: `""`; `type`: `"bytes32"`; \}\]; `stateMutability`: `"pure"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\{ `name`: `""`; `type`: `"bytes32"`; \}\]; `name`: `"recorders"`; `outputs`: readonly \[\{ `name`: `""`; `type`: `"address"`; \}\]; `stateMutability`: `"view"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\{ `name`: `""`; `type`: `"bytes32"`; \}\]; `name`: `"conditions"`; `outputs`: readonly \[\{ `name`: `""`; `type`: `"address"`; \}\]; `stateMutability`: `"view"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\{ `name`: `"escrowPeriod"`; `type`: `"uint256"`; \}, \{ `name`: `"freezePolicy"`; `type`: `"address"`; \}\]; `name`: `"deploy"`; `outputs`: readonly \[\{ `name`: `"recorder"`; `type`: `"address"`; \}, \{ `name`: `"condition"`; `type`: `"address"`; \}\]; `stateMutability`: `"nonpayable"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\{ `indexed`: `true`; `name`: `"condition"`; `type`: `"address"`; \}, \{ `indexed`: `false`; `name`: `"recorder"`; `type`: `"address"`; \}, \{ `indexed`: `false`; `name`: `"escrowPeriod"`; `type`: `"uint256"`; \}\]; `name`: `"EscrowPeriodConditionDeployed"`; `type`: `"event"`; \}\]

Defined in: [core/src/factory/index.ts:307](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L307)

ABI for EscrowPeriodConditionFactory contract

Key functions:
- computeAddresses(escrowPeriod, freezePolicy) - Get deterministic addresses
- deploy(escrowPeriod, freezePolicy) - Deploy recorder and condition pair
- getDeployed(escrowPeriod, freezePolicy) - Get deployed addresses
