import type { ResolvedSigner, SignerFlags } from '../types.js'
import { SignerResolutionError } from './error.js'
import { resolveKeySigner } from './key.js'
import { resolveModuleSigner } from './module.js'
import { resolveRpcSigner } from './rpc.js'

export { SignerResolutionError } from './error.js'

/**
 * Resolve exactly one signer source. Errors if zero or multiple sources are
 * configured, or if any single source is partially configured. CLI flags take
 * precedence over environment variables within each source.
 */
export async function resolveSigner(
  flags: SignerFlags,
): Promise<ResolvedSigner> {
  const candidates: Array<{
    name: string
    run: () => Promise<ResolvedSigner | null> | ResolvedSigner | null
  }> = [
    { name: 'key', run: () => resolveKeySigner(flags) },
    { name: 'rpc', run: () => resolveRpcSigner(flags) },
    { name: 'module', run: () => resolveModuleSigner(flags) },
  ]

  const present: Array<{ name: string; run: () => unknown }> = []
  for (const c of candidates) {
    if (isSourcePresent(c.name, flags)) present.push(c)
  }

  if (present.length === 0) {
    throw new SignerResolutionError(
      [
        'no signer configured — provide one of:',
        '  --key <0x...>                 (or PRIVATE_KEY)',
        '  --signer-url <url> --signer-address <0x...>',
        '                                (or SIGNER_URL + SIGNER_ADDRESS)',
        '  --signer-module <pkg-or-path> (or SIGNER_MODULE)',
      ].join('\n'),
    )
  }

  if (present.length > 1) {
    throw new SignerResolutionError(
      `multiple signer sources configured (${present
        .map((p) => p.name)
        .join(', ')}) — provide exactly one`,
    )
  }

  const resolved = await present[0]!.run()
  if (!resolved) {
    throw new SignerResolutionError(
      `${present[0]!.name} signer failed to resolve`,
    )
  }
  return resolved as ResolvedSigner
}

function isSourcePresent(name: string, flags: SignerFlags): boolean {
  switch (name) {
    case 'key':
      return Boolean(flags.key ?? process.env.PRIVATE_KEY)
    case 'rpc':
      return Boolean(
        flags.signerUrl ??
          process.env.SIGNER_URL ??
          flags.signerAddress ??
          process.env.SIGNER_ADDRESS,
      )
    case 'module':
      return Boolean(flags.signerModule ?? process.env.SIGNER_MODULE)
    default:
      return false
  }
}
