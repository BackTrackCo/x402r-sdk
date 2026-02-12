/**
 * IPFS utilities for fetching evidence content
 * @module ipfs
 */

/** Default IPFS gateway URL */
const DEFAULT_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

/** Default timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Configuration for IPFS operations
 */
export interface IpfsConfig {
  /** IPFS gateway URL (default: https://gateway.pinata.cloud/ipfs/) */
  gatewayUrl?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * Construct a full IPFS gateway URL from a CID
 *
 * @param cid - The IPFS content identifier
 * @param gatewayUrl - Optional custom gateway URL (default: Pinata)
 * @returns The full URL to fetch the content
 */
export function ipfsUrl(cid: string, gatewayUrl?: string): string {
  const gateway = gatewayUrl ?? DEFAULT_GATEWAY;
  const base = gateway.endsWith("/") ? gateway : `${gateway}/`;
  return `${base}${cid}`;
}

/**
 * Fetch and parse content from IPFS
 *
 * Attempts to parse the response as JSON. Falls back to returning the raw text
 * if JSON parsing fails.
 *
 * @param cid - The IPFS content identifier
 * @param config - Optional IPFS configuration
 * @returns The parsed content (JSON object or raw text string)
 */
export async function fetchFromIpfs<T = unknown>(cid: string, config?: IpfsConfig): Promise<T> {
  const url = ipfsUrl(cid, config?.gatewayUrl);
  const timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
