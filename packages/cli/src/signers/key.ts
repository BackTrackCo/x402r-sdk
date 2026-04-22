import { privateKeyToAccount } from 'viem/accounts'
import type { ResolvedSigner, SignerFlags } from '../types.js'
import { SignerResolutionError } from './error.js'

const HEX_KEY = /^(0x)?[0-9a-fA-F]{64}$/

export function resolveKeySigner(flags: SignerFlags): ResolvedSigner | null {
  const raw = flags.key ?? process.env.PRIVATE_KEY
  if (!raw) return null
  if (!HEX_KEY.test(raw)) {
    throw new SignerResolutionError(
      'private key is not a valid 32-byte hex string',
    )
  }
  const normalized = (raw.startsWith('0x') ? raw : `0x${raw}`) as `0x${string}`
  return {
    account: privateKeyToAccount(normalized),
    kind: 'key',
  }
}
