import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-page-header',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar>
      @if (back()) {
        <button mat-icon-button type="button" aria-label="Back" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
      }
      <h1 class="title">{{ title() }}</h1>
      <span class="spacer"></span>
      <ng-content />
    </mat-toolbar>
  `,
  styles: `
    :host { position: sticky; top: 0; z-index: 5; display: block; }
    /* On wide screens the toolbar content lines up with the centred 720px page column. */
    mat-toolbar {
      background: var(--mat-sys-surface-container); gap: 4px;
      padding-top: env(safe-area-inset-top);
      padding-inline: max(8px, calc((100% - 736px) / 2));
    }
    .title { font: var(--mat-sys-title-large); margin: 0 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .spacer { flex: 1; }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly back = input(true);
  /** Where "back" goes when there is no in-app history (e.g. opened from a link). */
  readonly fallback = input('/home');

  private location = inject(Location);
  private router = inject(Router);

  goBack(): void {
    // The router stamps each history entry with an increasing navigationId; 1 = app entry point.
    const navId = (this.location.getState() as { navigationId?: number } | null)?.navigationId ?? 1;
    if (navId > 1) this.location.back();
    else void this.router.navigateByUrl(this.fallback());
  }
}
