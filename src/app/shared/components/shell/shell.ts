import { Component, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ExpiryService } from '../../../core/services/expiry.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatBadgeModule],
  template: `
    <main class="shell-content">
      <router-outlet />
    </main>
    <nav class="bottom-nav" aria-label="Main">
      <a routerLink="/home" routerLinkActive="active" ariaCurrentWhenActive="page">
        <mat-icon>home</mat-icon>
        <span>Home</span>
      </a>
      <a routerLink="/expiry" routerLinkActive="active" ariaCurrentWhenActive="page">
        <mat-icon [matBadge]="expiry.attentionCount() || null" matBadgeColor="warn" matBadgeSize="small">event_busy</mat-icon>
        <span>Expiry</span>
      </a>
    </nav>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100dvh; }
    .shell-content { flex: 1; padding-bottom: calc(72px + env(safe-area-inset-bottom)); }
    .bottom-nav {
      position: fixed; inset: auto 0 0 0; z-index: 10;
      display: grid; grid-template-columns: repeat(2, minmax(0, 200px)); justify-content: center;
      height: 64px; padding-bottom: env(safe-area-inset-bottom);
      background: var(--mat-sys-surface-container);
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .bottom-nav a {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      color: var(--mat-sys-on-surface-variant); text-decoration: none; font: var(--mat-sys-label-medium);
    }
    .bottom-nav a mat-icon { padding: 2px 20px; border-radius: 16px; transition: background 0.2s; overflow: visible; }
    .bottom-nav a.active { color: var(--mat-sys-on-surface); }
    .bottom-nav a.active mat-icon { background: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); }
  `,
})
export class Shell {
  protected expiry = inject(ExpiryService);
}
