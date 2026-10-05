import { HttpClient } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';

/** Step-by-step instructions for deploying apps-script/Code.gs, with a copy button. */
@Component({
  selector: 'app-script-help',
  imports: [MatExpansionModule, MatButtonModule, MatIconModule],
  template: `
    <mat-expansion-panel [expanded]="expanded()">
      <mat-expansion-panel-header>
        <mat-panel-title><mat-icon>help_outline</mat-icon>&nbsp;How to connect your Google Sheet</mat-panel-title>
      </mat-expansion-panel-header>
      <ol>
        <li>Open (or create) your Google Sheet on a computer.</li>
        <li>Click <b>Extensions → Apps Script</b>.</li>
        <li>
          Delete the code there and paste the bridge script:
          <button mat-stroked-button type="button" (click)="copy()">
            <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
            {{ copied() ? 'Copied' : 'Copy script' }}
          </button>
        </li>
        <li>Click <b>Save</b>, then <b>Deploy → New deployment</b> and choose <b>Web app</b>.</li>
        <li>Set <b>Execute as: Me</b> and <b>Who has access: Anyone</b>, then <b>Deploy</b> and allow the permissions.</li>
        <li>Copy the <b>Web app URL</b> (it ends in <code>/exec</code>) and paste it below.</li>
      </ol>
      <p class="note">Your data stays in your own Sheet. Keep this URL private, because anyone who has it can read the Sheet.</p>
    </mat-expansion-panel>
  `,
  styles: `
    ol { padding-left: 20px; margin: 0; display: grid; gap: 8px; }
    li button { margin-top: 6px; display: flex; }
    .note { font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); margin: 12px 0 0; }
    mat-panel-title { display: flex; align-items: center; }
  `,
})
export class ScriptHelp {
  private http = inject(HttpClient);
  protected copied = signal(false);
  readonly expanded = input(true);

  async copy(): Promise<void> {
    const code = await firstValueFrom(this.http.get('bridge/Code.gs', { responseType: 'text' }));
    await navigator.clipboard.writeText(code);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }
}
