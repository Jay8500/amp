import { Injectable } from '@angular/core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { AppConfig } from '../models/form-config.model';
import { SellerProfile, Session } from '../models/seller.model';

interface CachedConfig {
  sellerId: string;
  config: AppConfig;
  savedAt: number;
}

interface AmDb extends DBSchema {
  sellers: { key: string; value: SellerProfile };
  configCache: { key: string; value: CachedConfig };
  meta: { key: string; value: unknown };
}

/**
 * Device-only storage. By design this holds session data only — seller profiles (PIN hash +
 * Apps Script URL), the active session and a cached form config. Customer/sale data is never
 * written here; it lives in the seller's Google Sheet and in memory while the app is open.
 */
@Injectable({ providedIn: 'root' })
export class LocalStoreService {
  private db?: Promise<IDBPDatabase<AmDb>>;

  private open(): Promise<IDBPDatabase<AmDb>> {
    this.db ??= openDB<AmDb>('accounts-manager', 1, {
      upgrade(db) {
        db.createObjectStore('sellers', { keyPath: 'sellerId' });
        db.createObjectStore('configCache', { keyPath: 'sellerId' });
        db.createObjectStore('meta');
      },
    });
    return this.db;
  }

  async getSeller(sellerId: string): Promise<SellerProfile | undefined> {
    return (await this.open()).get('sellers', sellerId);
  }

  async listSellerIds(): Promise<string[]> {
    return (await this.open()).getAllKeys('sellers');
  }

  async putSeller(profile: SellerProfile): Promise<void> {
    await (await this.open()).put('sellers', profile);
  }

  async getSession(): Promise<Session | undefined> {
    return (await (await this.open()).get('meta', 'session')) as Session | undefined;
  }

  async setSession(session: Session | null): Promise<void> {
    const db = await this.open();
    if (session) await db.put('meta', session, 'session');
    else await db.delete('meta', 'session');
  }

  async getCachedConfig(sellerId: string): Promise<AppConfig | undefined> {
    return (await (await this.open()).get('configCache', sellerId))?.config;
  }

  async setCachedConfig(sellerId: string, config: AppConfig): Promise<void> {
    await (await this.open()).put('configCache', { sellerId, config, savedAt: Date.now() });
  }
}
