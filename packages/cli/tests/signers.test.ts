import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveSigner, SignerResolutionError } from '../src/signers/index.js'

const KEY_ENVS = [
  'PRIVATE_KEY',
  'SIGNER_URL',
  'SIGNER_ADDRESS',
  'SIGNER_MODULE',
]

function clearEnv() {
  for (const k of KEY_ENVS) delete process.env[k]
}

describe('resolveSigner', () => {
  beforeEach(clearEnv)
  afterEach(clearEnv)

  it('errors when nothing is configured', async () => {
    await expect(resolveSigner({})).rejects.toBeInstanceOf(
      SignerResolutionError,
    )
  })

  it('errors when multiple sources are configured', async () => {
    await expect(
      resolveSigner({
        key: `0x${'a'.repeat(64)}`,
        signerModule: 'some-pkg',
      }),
    ).rejects.toThrow(/multiple signer sources/i)
  })

  it('errors when RPC signer is partially configured (url only)', async () => {
    await expect(
      resolveSigner({ signerUrl: 'https://signer.example' }),
    ).rejects.toThrow(/signer-url.*signer-address/i)
  })

  it('errors when RPC signer is partially configured (address only)', async () => {
    await expect(
      resolveSigner({ signerAddress: `0x${'a'.repeat(40)}` }),
    ).rejects.toThrow(/signer-url.*signer-address/i)
  })

  it('resolves a raw-key signer from a flag', async () => {
    const key = `0x${'a'.repeat(64)}`
    const out = await resolveSigner({ key })
    expect(out.kind).toBe('key')
    expect(out.account.address).toMatch(/^0x[0-9a-fA-F]{40}$/)
  })

  it('falls back to PRIVATE_KEY env', async () => {
    process.env.PRIVATE_KEY = `0x${'b'.repeat(64)}`
    const out = await resolveSigner({})
    expect(out.kind).toBe('key')
  })

  it('rejects a malformed private key', async () => {
    await expect(resolveSigner({ key: '0xdeadbeef' })).rejects.toThrow(
      /valid 32-byte hex/,
    )
  })

  it('resolves an RPC signer (account has signTypedData)', async () => {
    const out = await resolveSigner({
      signerUrl: 'https://signer.example/rpc',
      signerAddress: `0x${'c'.repeat(40)}`,
    })
    expect(out.kind).toBe('rpc')
    expect(out.account.address.toLowerCase()).toBe(`0x${'c'.repeat(40)}`)
    expect(typeof out.account.signTypedData).toBe('function')
  })

  it('resolves a custom module signer', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'x402r-cli-test-'))
    const modPath = join(dir, 'signer.mjs')
    const addr = `0x${'d'.repeat(40)}`
    writeFileSync(
      modPath,
      `export default async function () {
        return {
          address: '${addr}',
          signTypedData: async () => '0x' + '0'.repeat(130),
        }
      }`,
    )
    try {
      const out = await resolveSigner({ signerModule: modPath })
      expect(out.kind).toBe('module')
      expect(out.account.address.toLowerCase()).toBe(addr)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects a module that returns a non-account', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'x402r-cli-test-'))
    const modPath = join(dir, 'bad.mjs')
    writeFileSync(
      modPath,
      `export default async function () { return { not: 'an account' } }`,
    )
    try {
      await expect(resolveSigner({ signerModule: modPath })).rejects.toThrow(
        /not a viem Account/,
      )
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects a module with no default export', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'x402r-cli-test-'))
    const modPath = join(dir, 'nodefault.mjs')
    writeFileSync(modPath, `export const name = 'nope'`)
    try {
      await expect(resolveSigner({ signerModule: modPath })).rejects.toThrow(
        /default function/,
      )
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
