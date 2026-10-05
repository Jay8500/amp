import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { SheetRecord } from '../models/record.model';
import { DEMO_URL, DemoBridge } from './demo-bridge';

interface BridgeResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface PingResult {
  name: string;
  timeZone: string;
  version: number;
}

export class BridgeError extends Error {}

/**
 * Client for the seller's Apps Script web app (apps-script/Code.gs).
 *
 * Requests are POSTed as `text/plain` on purpose: that is a CORS "simple request", so the
 * browser skips the OPTIONS preflight that Apps Script cannot answer.
 */
@Injectable({ providedIn: 'root' })
export class SheetsApiService {
  private http = inject(HttpClient);
  private url = '';

  setUrl(url: string): void {
    this.url = url;
  }

  ping(url = this.url): Promise<PingResult> {
    return this.call<PingResult>({ action: 'ping' }, url);
  }

  getConfig(): Promise<Record<string, unknown>> {
    return this.call({ action: 'getConfig' });
  }

  setConfig(key: string, value: unknown): Promise<void> {
    return this.call({ action: 'setConfig', key, value });
  }

  deleteConfig(key: string): Promise<void> {
    return this.call({ action: 'deleteConfig', key });
  }

  headers(sheet: string): Promise<string[]> {
    return this.call({ action: 'headers', sheet });
  }

  list(sheet: string): Promise<SheetRecord[]> {
    return this.call({ action: 'list', sheet });
  }

  append(sheet: string, record: Record<string, string>): Promise<SheetRecord> {
    return this.call({ action: 'append', sheet, record });
  }

  appendMany(sheet: string, records: Record<string, string>[]): Promise<SheetRecord[]> {
    return this.call({ action: 'appendMany', sheet, records });
  }

  update(sheet: string, id: string, record: Record<string, string>): Promise<void> {
    return this.call({ action: 'update', sheet, id, record });
  }

  remove(sheet: string, id: string): Promise<void> {
    return this.call({ action: 'remove', sheet, id });
  }

  /** Starts a fresh set of sample data (Demo mode). */
  resetDemo(): void {
    this.demo = new DemoBridge();
  }

  private demo = new DemoBridge();

  private async call<T>(body: object, url = this.url): Promise<T> {
    if (url === DEMO_URL) {
      await new Promise((r) => setTimeout(r, 150)); // feel like a network call
      try {
        return this.demo.handle(body as Record<string, unknown>) as T;
      } catch (err) {
        throw new BridgeError((err as Error).message);
      }
    }
    if (!url) throw new BridgeError('Google Sheet is not connected.');
    if (!navigator.onLine) throw new BridgeError('You are offline. Connect to the internet and try again.');

    let res: BridgeResponse<T>;
    try {
      res = await firstValueFrom(
        this.http
          .post<BridgeResponse<T>>(url, JSON.stringify(body), {
            headers: new HttpHeaders({ 'Content-Type': 'text/plain;charset=utf-8' }),
          })
          .pipe(timeout(45_000)),
      );
    } catch (err) {
      throw new BridgeError(describeHttpError(err));
    }
    if (!res || typeof res !== 'object' || !('ok' in res)) {
      throw new BridgeError('Unexpected reply. Check that the URL is the Apps Script "Web app" /exec link.');
    }
    if (!res.ok) throw new BridgeError(res.error || 'The Google Sheet rejected the request.');
    return res.data as T;
  }
}

function describeHttpError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Could not reach the Google Sheet. Check the internet connection and that the script is deployed with access "Anyone".';
    }
    if (err.status === 200) {
      // Apps Script returns an HTML login/error page when deployed with the wrong access setting.
      return 'The script returned a web page instead of data. Re-deploy it with "Who has access: Anyone".';
    }
    return `Google Sheet request failed (${err.status}).`;
  }
  if (err instanceof Error && err.name === 'TimeoutError') return 'Google Sheet took too long to respond. Try again.';
  return 'Google Sheet request failed.';
}
