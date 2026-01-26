[**x402r-sdk**](../../README.md)

***

[x402r-sdk](../../README.md) / core/src

# core/src

@x402r/core - Core types, ABIs, and utilities for the X402r SDK

## Enumerations

- [PaymentState](enumerations/PaymentState.md)
- [RequestStatus](enumerations/RequestStatus.md)

## Classes

- [X402rError](classes/X402rError.md)

## Interfaces

- [AndConditionConfig](interfaces/AndConditionConfig.md)
- [ContractErrorDefinition](interfaces/ContractErrorDefinition.md)
- [DecodedContractError](interfaces/DecodedContractError.md)
- [EscrowPeriodConfig](interfaces/EscrowPeriodConfig.md)
- [EscrowPeriodConfigInput](interfaces/EscrowPeriodConfigInput.md)
- [FreezePolicyConfig](interfaces/FreezePolicyConfig.md)
- [FreezePolicyConfigInput](interfaces/FreezePolicyConfigInput.md)
- [NetworkConfig](interfaces/NetworkConfig.md)
- [NotConditionConfig](interfaces/NotConditionConfig.md)
- [OrConditionConfig](interfaces/OrConditionConfig.md)
- [PaymentInfo](interfaces/PaymentInfo.md)
- [PaymentOperatorConfig](interfaces/PaymentOperatorConfig.md)
- [PaymentOperatorConfigInput](interfaces/PaymentOperatorConfigInput.md)
- [RefundRequestData](interfaces/RefundRequestData.md)
- [StaticAddressConditionConfig](interfaces/StaticAddressConditionConfig.md)

## Type Aliases

- [AuthCaptureEscrowABIType](type-aliases/AuthCaptureEscrowABIType.md)
- [ConditionAddress](type-aliases/ConditionAddress.md)
- [ConditionConfig](type-aliases/ConditionConfig.md)
- [ContractErrorName](type-aliases/ContractErrorName.md)
- [EscrowPeriodRecorderABIType](type-aliases/EscrowPeriodRecorderABIType.md)
- [PaymentOperatorABIType](type-aliases/PaymentOperatorABIType.md)
- [RefundRequestABIType](type-aliases/RefundRequestABIType.md)
- [StaticAddressConditionABIType](type-aliases/StaticAddressConditionABIType.md)

## Variables

- [AlwaysTrueConditionABI](variables/AlwaysTrueConditionABI.md)
- [AndConditionABI](variables/AndConditionABI.md)
- [AuthCaptureEscrowABI](variables/AuthCaptureEscrowABI.md)
- [BASIS\_POINTS](variables/BASIS_POINTS.md)
- [CONDITION\_SINGLETONS](variables/CONDITION_SINGLETONS.md)
- [conditions](variables/conditions.md)
- [CONTRACT\_ERRORS](variables/CONTRACT_ERRORS.md)
- [EscrowPeriodConditionFactoryABI](variables/EscrowPeriodConditionFactoryABI.md)
- [EscrowPeriodRecorderABI](variables/EscrowPeriodRecorderABI.md)
- [FreezePolicyFactoryABI](variables/FreezePolicyFactoryABI.md)
- [IConditionABI](variables/IConditionABI.md)
- [MAX\_UINT32](variables/MAX_UINT32.md)
- [MAX\_UINT48](variables/MAX_UINT48.md)
- [NETWORK\_CONFIG](variables/NETWORK_CONFIG.md)
- [NotConditionABI](variables/NotConditionABI.md)
- [OrConditionABI](variables/OrConditionABI.md)
- [PayerConditionABI](variables/PayerConditionABI.md)
- [PAYMENT\_INFO\_TYPEHASH](variables/PAYMENT_INFO_TYPEHASH.md)
- [PaymentOperatorABI](variables/PaymentOperatorABI.md)
- [PaymentOperatorFactoryABI](variables/PaymentOperatorFactoryABI.md)
- [ReceiverConditionABI](variables/ReceiverConditionABI.md)
- [RefundRequestABI](variables/RefundRequestABI.md)
- [StaticAddressConditionABI](variables/StaticAddressConditionABI.md)
- [SupportedNetworks](variables/SupportedNetworks.md)
- [ZERO\_ADDRESS](variables/ZERO_ADDRESS.md)

## Functions

- [computePaymentInfoHash](functions/computePaymentInfoHash.md)
- [createEscrowPeriodConfig](functions/createEscrowPeriodConfig.md)
- [createFreezePolicyConfig](functions/createFreezePolicyConfig.md)
- [createPaymentOperatorConfig](functions/createPaymentOperatorConfig.md)
- [decodeContractError](functions/decodeContractError.md)
- [getNetworkConfig](functions/getNetworkConfig.md)
- [isSupportedNetwork](functions/isSupportedNetwork.md)
- [isValidAddress](functions/isValidAddress.md)
- [isValidPaymentInfo](functions/isValidPaymentInfo.md)
- [isX402rError](functions/isX402rError.md)
