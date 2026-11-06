import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import hi from '../apps/customer/src/locales/hi.json';
import mr from '../apps/customer/src/locales/mr.json';
import { translate, validLanguage } from '../apps/customer/src/lib/i18n';
describe('UI localization', () => {
  it('translates source keys with whitespace, placeholders and eligibility numbers', () => {
    expect(translate(' Save profile ', 'hi')).toBe(' प्रोफ़ाइल सहेजें ');
    expect(translate('Save {name}', 'mr', { name: 'Biz Fibre' })).toBe('Biz Fibre जतन करा');
    expect(translate('Needs at least 25 employees', 'hi')).toContain('25 कर्मचारी');
    expect(translate('Unknown customer-supplied text', 'hi')).toBe('Unknown customer-supplied text');
    expect(translate('My orders', 'en')).toBe('My orders');
    expect(validLanguage('invalid')).toBe(false);
  });
  it('keeps Hindi and Marathi dictionaries complete and interpolation tokens consistent', () => {
    expect(Object.keys(hi).sort()).toEqual(Object.keys(mr).sort());
    for (const [key, hindi] of Object.entries(hi)) {
      const marathi = mr[key as keyof typeof mr];
      expect([...hindi.matchAll(/\{\w+\}/g)].map(x => x[0]).sort(), key).toEqual([...key.matchAll(/\{\w+\}/g)].map(x => x[0]).sort());
      expect([...marathi.matchAll(/\{\w+\}/g)].map(x => x[0]).sort(), key).toEqual([...key.matchAll(/\{\w+\}/g)].map(x => x[0]).sort());
    }
  });
  it('covers every static UI translation call, except unchanged branding and keyboard shortcuts', () => {
    const root = join(process.cwd(), 'apps/customer/src');
    const files = ['App.tsx', ...['pages','components','lib'].flatMap(dir => readdirSync(join(root, dir)).filter(name => name.endsWith('.tsx')).map(name => dir + '/' + name))];
    const brands = new Set(['ACCEL TELECOM','Accel','Telecom','N','AS','⌘ K']);
    const missing = new Set<string>();
    for (const file of files) {
      const source = readFileSync(join(root, file), 'utf8');
      for (const match of source.matchAll(/\bt\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g)) {
        const key: string = (match[1][0] === '"' ? JSON.parse(match[1]) : match[1].slice(1,-1).replace(/\\'/g, "'")).trim();
        if (!Object.hasOwn(hi, key) && !brands.has(key)) missing.add(key);
      }
    }
    expect([...missing]).toEqual([]);
  });
});
