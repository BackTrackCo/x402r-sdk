import type { Address } from 'viem'

export interface TokenInfo {
  name: string
  version: string
  decimals: number
  symbol: string
}

export const KNOWN_TOKEN_INFO: Record<number, Record<Address, TokenInfo>> = {
  84532: {
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e': {
      name: 'USDC',
      version: '2',
      decimals: 6,
      symbol: 'USDC',
    },
  },
  8453: {
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': {
      name: 'USD Coin',
      version: '2',
      decimals: 6,
      symbol: 'USDC',
    },
  },
  11155111: {
    '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238': {
      name: 'USDC',
      version: '2',
      decimals: 6,
      symbol: 'USDC',
    },
  },
  1: {
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
      name: 'USD Coin',
      version: '2',
      decimals: 6,
      symbol: 'USDC',
    },
  },
  137: {
    '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359': {
      name: 'USD Coin',
      version: '2',
      decimals: 6,
      symbol: 'USDC',
    },
  },
  42161: {
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': {
      name: 'USD Coin',
      version: '2',
      decimals: 6,
      symbol: 'USDC',
    },
  },
  42220: {
    '0xcebA9300f2b948710d2653dD7B07f33A8B32118C': {
      name: 'USD Coin',
      version: '2',
      decimals: 6,
      symbol: 'USDC',
    },
  },
  143: {
    '0x754704Bc059F8C67012fEd69BC8A327a5aafb603': {
      name: 'USDC',
      version: '2',
      decimals: 6,
      symbol: 'USDC',
    },
  },
  10: {
    '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85': {
      name: 'USD Coin',
      version: '2',
      decimals: 6,
      symbol: 'USDC',
    },
  },
  43114: {
    '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E': {
      name: 'USD Coin',
      version: '2',
      decimals: 6,
      symbol: 'USDC',
    },
  },
}

export function getTokenInfo(
  chainId: number,
  tokenAddress: Address,
): TokenInfo | undefined {
  const chainTokens = KNOWN_TOKEN_INFO[chainId]
  if (!chainTokens) return undefined
  const lower = tokenAddress.toLowerCase()
  for (const [addr, info] of Object.entries(chainTokens)) {
    if (addr.toLowerCase() === lower) return info
  }
  return undefined
}
