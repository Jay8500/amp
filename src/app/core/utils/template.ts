/**
 * Fills `{Column Name}` placeholders. Lines whose placeholders are all empty are dropped,
 * so e.g. a "PIN: {PIN}" line disappears for accounts without a PIN.
 */
export function fillTemplate(template: string, values: Record<string, string | undefined>): string {
  const lookup = new Map(Object.entries(values).map(([k, v]) => [k.trim().toLowerCase(), (v ?? '').trim()]));
  return template
    .split('\n')
    .flatMap((line) => {
      let hadPlaceholder = false;
      let hadValue = false;
      const out = line.replace(/\{([^{}]+)\}/g, (_, name: string) => {
        hadPlaceholder = true;
        const v = lookup.get(name.trim().toLowerCase()) ?? '';
        if (v) hadValue = true;
        return v;
      });
      return hadPlaceholder && !hadValue ? [] : [out];
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
