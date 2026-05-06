import type { AbiParameterToPrimitiveType } from 'viem'
import type {
  paymentOperatorAbi,
  paymentOperatorFactoryAbi,
} from '../abis/generated.js'

// ---------------------------------------------------------------------------
// PaymentInfo — derived from AuthCaptureEscrow.PaymentInfo struct
// ---------------------------------------------------------------------------
// abitype mapping: address → `0x${string}`, uint8–uint48 → number,
//                  uint56–uint256 → bigint

type AuthorizeFn = Extract<
  (typeof paymentOperatorAbi)[number],
  { type: 'function'; name: 'authorize' }
>

export type PaymentInfo = AbiParameterToPrimitiveType<AuthorizeFn['inputs'][0]>

// ---------------------------------------------------------------------------
// PluginConfig — derived from PaymentOperator constructor's _pluginConfig param
// ---------------------------------------------------------------------------

type ConstructorDef = Extract<
  (typeof paymentOperatorAbi)[number],
  { type: 'constructor' }
>

export type PluginConfig = AbiParameterToPrimitiveType<
  ConstructorDef['inputs'][4]
>

// ---------------------------------------------------------------------------
// OperatorConfig — derived from PaymentOperatorFactory.deployOperator config param
// ---------------------------------------------------------------------------

type DeployOperatorFn = Extract<
  (typeof paymentOperatorFactoryAbi)[number],
  { type: 'function'; name: 'deployOperator' }
>

export type OperatorConfig = AbiParameterToPrimitiveType<
  DeployOperatorFn['inputs'][0]
>
