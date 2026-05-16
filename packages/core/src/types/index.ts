import type { AbiParameterToPrimitiveType } from 'viem'
import type {
  paymentOperatorAbi,
  paymentOperatorFactoryAbi,
} from '../abis/generated.js'
import { ValidationError } from '../errors/index.js'

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
// PaymentInfoWire — JSON-safe shape of PaymentInfo (bigints become strings)
// ---------------------------------------------------------------------------
// Derived from PaymentInfo so a contract ABI change updates both shapes
// together. Same physical layout as `@x402r/evm`'s `PaymentInfoStruct`;
// defined locally so `@x402r/core` doesn't take a scheme-package dep.

/** Type-level mirror of "what does this primitive look like once it crosses JSON?" */
export type AbiPrimitiveToWire<T> = T extends bigint
  ? string
  : T extends readonly (infer U)[]
    ? readonly AbiPrimitiveToWire<U>[]
    : T extends object
      ? { [K in keyof T]: AbiPrimitiveToWire<T[K]> }
      : T

export type PaymentInfoWire = AbiPrimitiveToWire<PaymentInfo>

// ---------------------------------------------------------------------------
// PaymentInfo namespace — wire ↔ primitive converters
// ---------------------------------------------------------------------------
// `type PaymentInfo` (above) and `const PaymentInfo` (below) share a name
// intentionally. Consumers use `PaymentInfo` as both a type annotation
// (`info: PaymentInfo`) and a value namespace (`PaymentInfo.fromWire(...)`).
// Same pattern as built-in `Date`, `Buffer`, etc.

export const PaymentInfo = {
  /**
   * Convert a JSON-form `PaymentInfoWire` to the bigint-form `PaymentInfo`
   * that escrow actions accept.
   *
   * Throws `ValidationError` when `maxAmount` or `salt` isn't a valid
   * uint256 (decimal or 0x-prefixed hex).
   */
  fromWire(wire: PaymentInfoWire): PaymentInfo {
    let maxAmount: bigint
    try {
      maxAmount = BigInt(wire.maxAmount)
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new ValidationError(
          `PaymentInfo.fromWire: invalid maxAmount '${wire.maxAmount}' — expected uint256 (decimal or 0x-prefixed hex)`,
          { cause: err },
        )
      }
      throw err
    }

    let salt: bigint
    try {
      salt = BigInt(wire.salt)
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new ValidationError(
          `PaymentInfo.fromWire: invalid salt '${wire.salt}' — expected uint256 (decimal or 0x-prefixed hex)`,
          { cause: err },
        )
      }
      throw err
    }

    return {
      operator: wire.operator,
      payer: wire.payer,
      receiver: wire.receiver,
      token: wire.token,
      maxAmount,
      preApprovalExpiry: wire.preApprovalExpiry,
      authorizationExpiry: wire.authorizationExpiry,
      refundExpiry: wire.refundExpiry,
      minFeeBps: wire.minFeeBps,
      maxFeeBps: wire.maxFeeBps,
      feeReceiver: wire.feeReceiver,
      salt,
    }
  },

  /**
   * Convert the bigint-form `PaymentInfo` to the JSON-safe `PaymentInfoWire`
   * for HTTP bodies, queue payloads, or database columns.
   */
  toWire(info: PaymentInfo): PaymentInfoWire {
    return {
      operator: info.operator,
      payer: info.payer,
      receiver: info.receiver,
      token: info.token,
      maxAmount: info.maxAmount.toString(),
      preApprovalExpiry: info.preApprovalExpiry,
      authorizationExpiry: info.authorizationExpiry,
      refundExpiry: info.refundExpiry,
      minFeeBps: info.minFeeBps,
      maxFeeBps: info.maxFeeBps,
      feeReceiver: info.feeReceiver,
      salt: `0x${info.salt.toString(16)}` as `0x${string}`,
    }
  },
} as const

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
