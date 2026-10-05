import { Component, computed, input } from '@angular/core';
import { OttBrand } from '../../../core/models/brand.model';

@Component({
  selector: 'app-brand-avatar',
  template: `
    @if (brand()?.logo; as logo) {
      <img [src]="logo" [alt]="label()" />
    } @else {
      <span [style.background]="brand()?.color || '#607d8b'">{{ initials() }}</span>
    }
  `,
  styles: `
    :host { display: inline-flex; width: var(--size); height: var(--size); flex: none; border-radius: 22%; overflow: hidden; }
    img, span { width: 100%; height: 100%; }
    img { object-fit: cover; }
    span { display: grid; place-items: center; color: #fff; font-weight: 600; font-size: calc(var(--size) * 0.36); letter-spacing: 0.5px; }
  `,
  host: { '[style.--size.px]': 'size()' },
})
export class BrandAvatar {
  readonly brand = input<OttBrand | undefined>();
  /** Shown when the brand isn't in the list (e.g. typed into the Sheet by hand). */
  readonly name = input('');
  readonly size = input(48);

  protected readonly label = computed(() => this.brand()?.name || this.name());
  protected readonly initials = computed(() => {
    const words = this.label().replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    return words.length === 1 ? words[0][0].toUpperCase() : (words[0][0] + words[1][0]).toUpperCase();
  });
}
