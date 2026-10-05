import { Component } from '@angular/core';

@Component({
  selector: 'app-powered-by',
  template: `
    <a href="https://spreadapps.in" target="_blank" rel="noopener">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="7" cy="17" r="2.5" fill="#8FE3D6" />
        <circle cx="13" cy="11" r="3.2" fill="#3BC9B0" />
        <circle cx="19.5" cy="5.5" r="4" fill="#0E9E86" />
      </svg>
      Powered by Spread Apps
    </a>
  `,
  styles: `
    :host { display: flex; justify-content: center; padding: 16px 0 8px; }
    a {
      display: inline-flex; align-items: center; gap: 6px;
      font: var(--mat-sys-label-medium); color: var(--mat-sys-on-surface-variant); text-decoration: none; opacity: 0.85;
    }
    a:hover { opacity: 1; }
  `,
})
export class PoweredBy {}
