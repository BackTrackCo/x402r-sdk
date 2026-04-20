import type { Hex } from 'viem'
import { createClient, http } from 'viem'
import { toAccount } from 'viem/accounts'
import type { ResolvedSigner, SignerFlags } from '../types.js'
import { SignerResolutionError } from './error.js'

const ADDRESS = /^0x[0-9a-fA-F]{40}$/

/**
 * Remote JSON-RPC signer. Delegates EIP-712 signing to any endpoint speaking
 * `eth_signTypedData_v4` (Privy wallet RPC, Turnkey, Fireblocks, Safe, a local
 * `cast wallet` endpoint, etc.). Payments only need typed-data signatures, so
 * raw tx signing is intentionally omitted.
 */
export function resolveRpcSigner(flags: SignerFlags): ResolvedSigner | null {
  const url = flags.signerUrl ?? process.env.SIGNER_URL
  const address = flags.signerAddress ?? process.env.SIGNER_ADDRESS
  if (!url && !address) return null
  if (!url || !address) {
    throw new SignerResolutionError(
      'remote RPC signer requires both --signer-url/SIGNER_URL and --signer-address/SIGNER_ADDRESS',
    )
  }
  if (!ADDRESS.test(address)) {
    throw new SignerResolutionError(
      'remote signer address is not a valid 0x-prefixed 20-byte hex',
    )
  }

  const client = createClient({ transport: http(url) })
  const addr = address as `0x${string}`

  const account = toAccount({
    address: addr,
    async signMessage({ message }) {
      const data =
        typeof message === 'string' ? toHex(message) : (message.raw as Hex)
      return (await client.request({
        method: 'personal_sign',
        params: [data, addr],
      } as never)) as Hex
    },
    async signTransaction() {
      throw new SignerResolutionError(
        'remote RPC signer does not support raw transaction signing; x402r only needs typed-data',
      )
    },
    async signTypedData(typedData) {
      // EIP-3009 payloads carry `value`, `validAfter`, and `validBefore` as
      // BigInt. `JSON.stringify` throws on BigInt by default, so we coerce
      // them to decimal strings (the encoding every `eth_signTypedData_v4`
      // endpoint accepts for uint256 fields).
      const json = JSON.stringify(typedData, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      )
      return (await client.request({
        method: 'eth_signTypedData_v4',
        params: [addr, json],
      } as never)) as Hex
    },
  })

  return { account, kind: 'rpc' }
}

function toHex(value: string): Hex {
  const bytes = new TextEncoder().encode(value)
  let out = '0x'
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out as Hex
}
