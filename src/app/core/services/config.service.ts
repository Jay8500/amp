import { Injectable, computed, inject, signal } from '@angular/core';
import { BUILT_IN_BRANDS, DEFAULT_CONFIG } from '../config/defaults';
import { OttBrand } from '../models/brand.model';
import { AppConfig, FieldRole, FormConfig, FormKind, GeneralSettings, MessageTemplates, ValidityPlan } from '../models/form-config.model';
import { LocalStoreService } from './local-store.service';
import { SheetsApiService } from './sheets-api.service';

const BRAND_PREFIX = 'brand:';
const FORM_KEYS: Record<FormKind, 'saleForm' | 'credentialsForm'> = { sale: 'saleForm', credentials: 'credentialsForm' };

/**
 * The seller's configuration. Source of truth is the `_Config` tab of their Sheet (so it
 * follows them across devices); a copy is cached in IndexedDB so the app opens instantly.
 */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private api = inject(SheetsApiService);
  private store = inject(LocalStoreService);

  private sellerId = '';
  readonly config = signal<AppConfig>(DEFAULT_CONFIG);
  readonly syncError = signal<string | null>(null);

  readonly saleForm = computed(() => this.config().saleForm);
  readonly credentialsForm = computed(() => this.config().credentialsForm);
  readonly plans = computed(() => this.config().plans);
  readonly templates = computed(() => this.config().templates);
  readonly settings = computed(() => this.config().settings);

  /** Built-ins (with any saved overrides) followed by the seller's custom brands. */
  readonly brands = computed<OttBrand[]>(() => {
    const saved = new Map(this.config().brands.map((b) => [b.id, b]));
    const builtIns = BUILT_IN_BRANDS.map((b) => ({ ...b, ...saved.get(b.id), builtIn: true }));
    const custom = this.config().brands.filter((b) => !b.builtIn);
    return [...builtIns, ...custom].filter((b) => !b.hidden);
  });

  /** `useCache: false` (Demo mode) keeps the config in memory only. */
  async load(sellerId: string, useCache = true): Promise<void> {
    this.sellerId = useCache ? sellerId : '';
    const cached = useCache ? await this.store.getCachedConfig(sellerId) : undefined;
    if (cached) {
      this.config.set(withDefaults(cached));
      void this.refresh(); // update in background
    } else {
      this.config.set(DEFAULT_CONFIG);
      await this.refresh();
    }
  }

  async refresh(): Promise<void> {
    try {
      const remote = await this.api.getConfig();
      const brands = Object.entries(remote)
        .filter(([k]) => k.startsWith(BRAND_PREFIX))
        .map(([, v]) => v as OttBrand);
      this.config.set(withDefaults({ ...(remote as Partial<AppConfig>), brands }));
      this.syncError.set(null);
      await this.persistCache();
    } catch (err) {
      this.syncError.set((err as Error).message);
    }
  }

  clear(): void {
    this.sellerId = '';
    this.config.set(DEFAULT_CONFIG);
    this.syncError.set(null);
  }

  form(kind: FormKind): FormConfig {
    return this.config()[FORM_KEYS[kind]];
  }

  /** Column header the seller mapped a role to, e.g. role 'expiryDate' → 'Expiry Date'. */
  column(kind: FormKind, role: FieldRole): string | undefined {
    return this.form(kind).fields.find((f) => f.role === role)?.column;
  }

  saveForm(kind: FormKind, form: FormConfig): Promise<void> {
    return this.save(FORM_KEYS[kind], form);
  }

  savePlans(plans: ValidityPlan[]): Promise<void> {
    return this.save('plans', plans);
  }

  saveTemplates(templates: MessageTemplates): Promise<void> {
    return this.save('templates', templates);
  }

  saveSettings(settings: GeneralSettings): Promise<void> {
    return this.save('settings', settings);
  }

  async saveBrand(brand: OttBrand): Promise<void> {
    await this.api.setConfig(BRAND_PREFIX + brand.id, brand);
    this.config.update((c) => ({ ...c, brands: [...c.brands.filter((b) => b.id !== brand.id), brand] }));
    await this.persistCache();
  }

  async deleteBrand(brand: OttBrand): Promise<void> {
    if (brand.builtIn) return this.saveBrand({ ...brand, hidden: true });
    await this.api.deleteConfig(BRAND_PREFIX + brand.id);
    this.config.update((c) => ({ ...c, brands: c.brands.filter((b) => b.id !== brand.id) }));
    await this.persistCache();
  }

  /** Includes hidden built-ins so they can be restored from Settings. */
  hiddenBrands(): OttBrand[] {
    return this.config().brands.filter((b) => b.builtIn && b.hidden);
  }

  private async save<K extends keyof AppConfig>(key: K, value: AppConfig[K]): Promise<void> {
    await this.api.setConfig(key, value);
    this.config.update((c) => ({ ...c, [key]: value }));
    await this.persistCache();
  }

  private async persistCache(): Promise<void> {
    if (this.sellerId) await this.store.setCachedConfig(this.sellerId, this.config());
  }
}

function withDefaults(partial: Partial<AppConfig>): AppConfig {
  return {
    saleForm: partial.saleForm ?? DEFAULT_CONFIG.saleForm,
    credentialsForm: partial.credentialsForm ?? DEFAULT_CONFIG.credentialsForm,
    plans: partial.plans?.length ? partial.plans : DEFAULT_CONFIG.plans,
    templates: { ...DEFAULT_CONFIG.templates, ...partial.templates },
    settings: { ...DEFAULT_CONFIG.settings, ...partial.settings },
    brands: partial.brands ?? [],
  };
}
