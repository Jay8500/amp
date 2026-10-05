import { AbstractControl, ValidationErrors } from '@angular/forms';
import { isScriptUrl } from '../services/session.service';

export const PIN_PATTERN = /^\d{4,6}$/;

export function pinsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('pin')?.value === group.get('confirmPin')?.value ? null : { pinMismatch: true };
}

export function scriptUrlValidator(control: AbstractControl): ValidationErrors | null {
  return !control.value || isScriptUrl(control.value) ? null : { scriptUrl: true };
}
