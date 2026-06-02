#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { CliError } from './errors.js'
import { type PayFlags, type PayResult, pay } from './pay/index.js'

const USAGE = `@x402r/cli — one-shot x402 payment CLI

Usage:
  x402r pay <url> [options]

Signer (exactly one):
  --key <0x...>               raw private key (env: PRIVATE_KEY)
  --signer-url <url>          JSON-RPC signer endpoint (env: SIGNER_URL)
  --signer-address <0x...>    address for the JSON-RPC signer (env: SIGNER_ADDRESS)
  --signer-module <pkg|path>  dynamic-imported factory (env: SIGNER_MODULE)

Request:
  --chain <eip155:id>                 pick an accepts[] entry when the 402 offers multiple
  --asset-transfer-method <eip3009|permit2>
                                      filter accepts[] by extra.assetTransferMethod
  --rpc <url>                         override the RPC URL for on-chain reads
  --max-amount <atomic>               refuse to pay more than this (atomic token units)

Output:
  --json                emit a single JSON envelope to stdout
  --help, -h            print this help

Exit codes:
  0 success  1 network  2 malformed 402  3 price > --max-amount
  4 signature rejected  5 settlement failed  6 signer resolution failed
`

async function main(argv: string[]): Promise<number> {
  if (argv.length === 0 || argv[0] === '-h' || argv[0] === '--help') {
    process.stdout.write(USAGE)
    return 0
  }

  const [command, ...rest] = argv
  if (command !== 'pay') {
    process.stderr.write(`unknown command "${command}"\n\n${USAGE}`)
    return 2
  }

  let parsed: ReturnType<typeof parseArgs>
  try {
    parsed = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        key: { type: 'string' },
        'signer-url': { type: 'string' },
        'signer-address': { type: 'string' },
        'signer-module': { type: 'string' },
        chain: { type: 'string' },
        'asset-transfer-method': { type: 'string' },
        rpc: { type: 'string' },
        'max-amount': { type: 'string' },
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    })
  } catch (err) {
    process.stderr.write(`${errorMessage(err)}\n\n${USAGE}`)
    return 2
  }

  if (parsed.values.help) {
    process.stdout.write(USAGE)
    return 0
  }

  const url = parsed.positionals[0]
  if (!url) {
    process.stderr.write(`pay requires a <url> positional\n\n${USAGE}`)
    return 2
  }

  const flags: PayFlags = {
    url,
    key: parsed.values.key as string | undefined,
    signerUrl: parsed.values['signer-url'] as string | undefined,
    signerAddress: parsed.values['signer-address'] as string | undefined,
    signerModule: parsed.values['signer-module'] as string | undefined,
    chain: parsed.values.chain as string | undefined,
    assetTransferMethod: parsed.values['asset-transfer-method'] as
      | string
      | undefined,
    rpc: parsed.values.rpc as string | undefined,
    maxAmount: parsed.values['max-amount'] as string | undefined,
    json: Boolean(parsed.values.json),
  }

  try {
    const result = await pay(flags)
    emit(result, Boolean(flags.json))
    return 0
  } catch (err) {
    return handleError(err, Boolean(flags.json))
  }
}

function emit(result: PayResult, json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(result)}\n`)
    return
  }
  process.stdout.write(result.body)
  if (!result.body.endsWith('\n')) process.stdout.write('\n')
  if (result.kind === 'success') {
    process.stderr.write(`tx: ${result.tx}\n`)
  }
  if (result.kind === 'success' || result.kind === 'passthrough') {
    process.stderr.write(
      `signer: ${result.signer.kind} (${result.signer.address})\n`,
    )
  }
  process.stderr.write(`elapsed: ${result.elapsedMs}ms\n`)
}

function handleError(err: unknown, json: boolean): number {
  if (err instanceof CliError) {
    emitError(err.message, err.exitCode, json)
    return err.exitCode
  }
  emitError(errorMessage(err), 1, json)
  return 1
}

function emitError(message: string, exitCode: number, json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify({ error: message, exitCode })}\n`)
  } else {
    process.stderr.write(`error: ${message}\n`)
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`unexpected: ${errorMessage(err)}\n`)
    process.exit(1)
  },
)
