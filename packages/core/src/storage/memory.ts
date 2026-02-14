/**
 * In-memory PaymentStore implementation.
 *
 * Stores PaymentInfo in a Map — useful for tests and ephemeral processes.
 * Data is lost on process exit.
 *
 * @module storage/memory
 */

import type { PaymentInfo, PaymentStore } from "../types/index.js";

export class MemoryPaymentStore implements PaymentStore {
  private readonly store = new Map<`0x${string}`, PaymentInfo>();

  async save(hash: `0x${string}`, paymentInfo: PaymentInfo): Promise<void> {
    this.store.set(hash, paymentInfo);
  }

  async load(hash: `0x${string}`): Promise<PaymentInfo | null> {
    return this.store.get(hash) ?? null;
  }

  async listByPayer(
    payer: `0x${string}`,
  ): Promise<Array<{ hash: `0x${string}`; paymentInfo: PaymentInfo }>> {
    const lowerPayer = payer.toLowerCase();
    const results: Array<{ hash: `0x${string}`; paymentInfo: PaymentInfo }> = [];
    for (const [hash, paymentInfo] of this.store) {
      if (paymentInfo.payer.toLowerCase() === lowerPayer) {
        results.push({ hash, paymentInfo });
      }
    }
    return results;
  }
}
