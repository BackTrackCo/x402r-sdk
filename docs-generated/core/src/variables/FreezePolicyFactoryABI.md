[**x402r-sdk**](../../../README.md)

***

[x402r-sdk](../../../README.md) / [core/src](../README.md) / FreezePolicyFactoryABI

# Variable: FreezePolicyFactoryABI

> `const` **FreezePolicyFactoryABI**: readonly \[\{ `inputs`: readonly \[\{ `name`: `"freezeCondition"`; `type`: `"address"`; \}, \{ `name`: `"unfreezeCondition"`; `type`: `"address"`; \}, \{ `name`: `"freezeDuration"`; `type`: `"uint256"`; \}\]; `name`: `"computeAddress"`; `outputs`: readonly \[\{ `name`: `"policy"`; `type`: `"address"`; \}\]; `stateMutability`: `"view"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\{ `name`: `"freezeCondition"`; `type`: `"address"`; \}, \{ `name`: `"unfreezeCondition"`; `type`: `"address"`; \}, \{ `name`: `"freezeDuration"`; `type`: `"uint256"`; \}\]; `name`: `"getDeployed"`; `outputs`: readonly \[\{ `name`: `"policy"`; `type`: `"address"`; \}\]; `stateMutability`: `"view"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\{ `name`: `"freezeCondition"`; `type`: `"address"`; \}, \{ `name`: `"unfreezeCondition"`; `type`: `"address"`; \}, \{ `name`: `"freezeDuration"`; `type`: `"uint256"`; \}\]; `name`: `"getKey"`; `outputs`: readonly \[\{ `name`: `""`; `type`: `"bytes32"`; \}\]; `stateMutability`: `"pure"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\{ `name`: `""`; `type`: `"bytes32"`; \}\]; `name`: `"policies"`; `outputs`: readonly \[\{ `name`: `""`; `type`: `"address"`; \}\]; `stateMutability`: `"view"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\{ `name`: `"freezeCondition"`; `type`: `"address"`; \}, \{ `name`: `"unfreezeCondition"`; `type`: `"address"`; \}, \{ `name`: `"freezeDuration"`; `type`: `"uint256"`; \}\]; `name`: `"deploy"`; `outputs`: readonly \[\{ `name`: `"policy"`; `type`: `"address"`; \}\]; `stateMutability`: `"nonpayable"`; `type`: `"function"`; \}, \{ `inputs`: readonly \[\{ `indexed`: `true`; `name`: `"policy"`; `type`: `"address"`; \}, \{ `indexed`: `false`; `name`: `"freezeCondition"`; `type`: `"address"`; \}, \{ `indexed`: `false`; `name`: `"unfreezeCondition"`; `type`: `"address"`; \}, \{ `indexed`: `false`; `name`: `"freezeDuration"`; `type`: `"uint256"`; \}\]; `name`: `"FreezePolicyDeployed"`; `type`: `"event"`; \}\]

Defined in: [core/src/factory/index.ts:393](https://github.com/BackTrackCo/x402r-sdk/blob/c9f3d1a611a84991662cd627efb33fb9b0b7f78f/packages/core/src/factory/index.ts#L393)

ABI for FreezePolicyFactory contract

Key functions:
- computeAddress(freezeCondition, unfreezeCondition, freezeDuration) - Get deterministic address
- deploy(freezeCondition, unfreezeCondition, freezeDuration) - Deploy policy
- getDeployed(freezeCondition, unfreezeCondition, freezeDuration) - Get deployed address
