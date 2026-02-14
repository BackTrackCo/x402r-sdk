/**
 * File-based PaymentStore implementation.
 *
 * Stores each PaymentInfo as a JSON file in a configurable directory
 * (default: `~/.x402r/payments/{hash}.json`). Survives process restarts.
 *
 * @module storage/file
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { PaymentInfo, PaymentStore } from "../types/index.js";
import {
  serializePaymentInfo,
  deserializePaymentInfo,
  type SerializedPaymentInfo,
} from "./serialization.js";

export class FilePaymentStore implements PaymentStore {
  private readonly dir: string;

  /**
   * @param dir - Directory to store payment JSON files.
   *              Defaults to `~/.x402r/payments`.
   */
  constructor(dir?: string) {
    this.dir = dir ?? join(homedir(), ".x402r", "payments");
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true });
    }
  }

  async save(hash: `0x${string}`, paymentInfo: PaymentInfo): Promise<void> {
    const filePath = join(this.dir, `${hash}.json`);
    const data = serializePaymentInfo(paymentInfo);
    writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  async load(hash: `0x${string}`): Promise<PaymentInfo | null> {
    const filePath = join(this.dir, `${hash}.json`);
    if (!existsSync(filePath)) {
      return null;
    }
    const raw: SerializedPaymentInfo = JSON.parse(readFileSync(filePath, "utf-8"));
    return deserializePaymentInfo(raw);
  }

  async listByPayer(
    payer: `0x${string}`,
  ): Promise<Array<{ hash: `0x${string}`; paymentInfo: PaymentInfo }>> {
    if (!existsSync(this.dir)) {
      return [];
    }
    const lowerPayer = payer.toLowerCase();
    const results: Array<{ hash: `0x${string}`; paymentInfo: PaymentInfo }> = [];

    const files = readdirSync(this.dir).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const filePath = join(this.dir, file);
      const raw: SerializedPaymentInfo = JSON.parse(readFileSync(filePath, "utf-8"));
      const paymentInfo = deserializePaymentInfo(raw);
      if (paymentInfo.payer.toLowerCase() === lowerPayer) {
        const hash = file.replace(".json", "") as `0x${string}`;
        results.push({ hash, paymentInfo });
      }
    }
    return results;
  }
}
