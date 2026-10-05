import { Injectable, computed, inject, signal } from '@angular/core';
import { SellerProfile } from '../models/seller.model';
import { hashPin, newSalt } from '../utils/crypto';
import { ConfigService } from './config.service';
import { LocalStoreService } from './local-store.service';
import { RecordsService } from './records.service';
import { SheetsApiService } from './sheets-api.service';

const SESSION_HOURS = 12;

export function normalizeSellerId(id: string): string {
  return id.trim().toLowerCase();
}

export function normalizeScriptUrl(url: string): string {
  return url.trim().split(/[?#]/)[0].replace(/\/+$/, '');
}

export function isScriptUrl(url: string): boolean {
  return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(normalizeScriptUrl(url));
}

/** Local ID + PIN login. There is no server account — the PIN only unlocks this device. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private store = inject(LocalStoreService);
  private api = inject(SheetsApiService);
  private config = inject(ConfigService);
  private records = inject(RecordsService);

  private readonly profile = signal<SellerProfile | null>(null);
  readonly sellerId = computed(() => this.profile()?.sellerId ?? null);
  readonly displayName = computed(() => this.profile()?.displayName || this.profile()?.sellerId || '');
  readonly scriptUrl = computed(() => this.profile()?.scriptUrl ?? '');
  readonly loggedIn = computed(() => this.profile() !== null);

  /** Called once at startup to resume an unexpired session. */
  async restore(): Promise<void> {
    const session = await this.store.getSession();
    if (!session || session.expiresAt < Date.now()) return;
    const profile = await this.store.getSeller(session.sellerId);
    if (profile) await this.activate(profile, false);
  }

  async sellerExists(sellerId: string): Promise<boolean> {
    return !!(await this.store.getSeller(normalizeSellerId(sellerId)));
  }

  /** Seller IDs on this device, as originally typed. */
  async knownSellers(): Promise<string[]> {
    return (await this.store.listSellers()).map((p) => p.displayName || p.sellerId);
  }

  async login(sellerId: string, pin: string): Promise<boolean> {
    const profile = await this.store.getSeller(normalizeSellerId(sellerId));
    if (!profile || (await hashPin(pin, profile.salt)) !== profile.pinHash) return false;
    await this.activate(profile, true);
    return true;
  }

  async register(sellerId: string, pin: string, scriptUrl: string): Promise<void> {
    const salt = newSalt();
    const profile: SellerProfile = {
      sellerId: normalizeSellerId(sellerId),
      displayName: sellerId.trim(),
      salt,
      pinHash: await hashPin(pin, salt),
      scriptUrl: normalizeScriptUrl(scriptUrl),
      createdAt: Date.now(),
    };
    await this.store.putSeller(profile);
    await this.activate(profile, true);
  }

  /**
   * Forgot-PIN flow: re-entering the same Apps Script URL proves ownership of the Sheet,
   * and the URL must still answer a ping.
   */
  async resetPin(sellerId: string, scriptUrl: string, newPin: string): Promise<'ok' | 'unknown' | 'mismatch'> {
    const profile = await this.store.getSeller(normalizeSellerId(sellerId));
    if (!profile) return 'unknown';
    if (normalizeScriptUrl(scriptUrl) !== profile.scriptUrl) return 'mismatch';
    await this.api.ping(profile.scriptUrl);
    profile.salt = newSalt();
    profile.pinHash = await hashPin(newPin, profile.salt);
    await this.store.putSeller(profile);
    await this.activate(profile, true);
    return 'ok';
  }

  async changeScriptUrl(scriptUrl: string): Promise<void> {
    const profile = this.profile();
    if (!profile) return;
    const updated = { ...profile, scriptUrl: normalizeScriptUrl(scriptUrl) };
    await this.store.putSeller(updated);
    this.records.clear();
    await this.activate(updated, false);
  }

  async logout(): Promise<void> {
    await this.store.setSession(null);
    this.profile.set(null);
    this.api.setUrl('');
    this.records.clear();
    this.config.clear();
  }

  private async activate(profile: SellerProfile, newSession: boolean): Promise<void> {
    this.api.setUrl(profile.scriptUrl);
    this.profile.set(profile);
    if (newSession) {
      await this.store.setSession({ sellerId: profile.sellerId, expiresAt: Date.now() + SESSION_HOURS * 3_600_000 });
    }
    await this.config.load(profile.sellerId);
  }
}
