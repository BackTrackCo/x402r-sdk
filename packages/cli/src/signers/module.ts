import { isAbsolute, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Account } from 'viem'
import { isAddress } from 'viem'
import type { ResolvedSigner, SignerFlags } from '../types.js'
import { SignerResolutionError } from './error.js'

/**
 * Custom module signer. Loads a user-supplied module whose default export is
 * `() => Promise<Account>`. Use this for SDK-only signers (Privy via
 * `@privy-io/server-auth` `createViemAccount`, Coinbase CDP server wallets,
 * Turnkey SDK, hardware-wallet wrappers, etc.). Keeps the CLI free of
 * provider-specific dependencies.
 */
export async function resolveModuleSigner(
  flags: SignerFlags,
): Promise<ResolvedSigner | null> {
  const spec = flags.signerModule ?? process.env.SIGNER_MODULE
  if (!spec) return null

  const specifier = await toImportSpecifier(spec)
  let mod: Record<string, unknown>
  try {
    mod = (await import(specifier)) as Record<string, unknown>
  } catch (err) {
    throw new SignerResolutionError(
      `failed to import signer module "${spec}": ${errorMessage(err)}`,
    )
  }

  const factory = mod.default
  if (typeof factory !== 'function') {
    throw new SignerResolutionError(
      `signer module "${spec}" must export a default function returning a viem Account`,
    )
  }

  let account: unknown
  try {
    account = await (factory as () => unknown)()
  } catch (err) {
    throw new SignerResolutionError(
      `signer module "${spec}" factory threw: ${errorMessage(err)}`,
    )
  }

  if (!isAccount(account)) {
    throw new SignerResolutionError(
      `signer module "${spec}" returned a value that is not a viem Account (missing address or signTypedData)`,
    )
  }

  return { account, kind: 'module' }
}

async function toImportSpecifier(spec: string): Promise<string> {
  // Bare package specifiers (e.g., "@my/signer") are passed through;
  // relative/absolute paths are resolved to a file URL so Node can import them.
  if (spec.startsWith('.') || isAbsolute(spec)) {
    return pathToFileURL(resolve(process.cwd(), spec)).href
  }
  return spec
}

function isAccount(value: unknown): value is Account {
  if (!value || typeof value !== 'object') return false
  const a = value as Record<string, unknown>
  return (
    typeof a.address === 'string' &&
    isAddress(a.address, { strict: false }) &&
    typeof a.signTypedData === 'function'
  )
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
