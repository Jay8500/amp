import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/** Loading / error / empty placeholder used by the list screens. */
@Component({
  selector: 'app-state-message',
  imports: [MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    @if (loading()) {
      <mat-spinner diameter="36" />
    } @else {
      <mat-icon [class.error]="!!error()">{{ error() ? 'cloud_off' : icon() }}</mat-icon>
      <p>{{ error() || message() }}</p>
      @if (error()) {
        <button mat-stroked-button type="button" (click)="retry.emit()">Try again</button>
      }
      <ng-content />
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 24px; text-align: center; color: var(--mat-sys-on-surface-variant); }
    mat-icon { width: 48px; height: 48px; font-size: 48px; opacity: 0.6; }
    mat-icon.error { color: var(--mat-sys-error); opacity: 1; }
    p { margin: 0; max-width: 320px; }
  `,
})
export class StateMessage {
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly icon = input('inbox');
  readonly message = input('Nothing here yet.');
  readonly retry = output<void>();
}
