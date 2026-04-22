import type { Account } from 'viem'

export type SignerKind = 'key' | 'rpc' | 'module'

export interface ResolvedSigner {
  account: Account
  kind: SignerKind
}

export interface SignerFlags {
  key?: string
  signerUrl?: string
  signerAddress?: string
  signerModule?: string
}
