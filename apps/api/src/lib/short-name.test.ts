import { describe, expect, it } from 'vitest';

import { shortName } from './short-name';

describe('shortName', () => {
  it('keeps the first name and the first letter of the last name', () => {
    expect(shortName('Danielle Hart')).toBe('Danielle H.');
  });

  it('uses the last word as the last name when there are several', () => {
    expect(shortName('Mohamed Ali Sabry')).toBe('Mohamed S.');
  });

  it('leaves a single name as it is', () => {
    expect(shortName('Layla')).toBe('Layla');
  });

  it('ignores extra spaces and capitalises the initial', () => {
    expect(shortName('  omar   test  ')).toBe('omar T.');
  });

  it('works with Arabic names', () => {
    expect(shortName('محمد صبري')).toBe('محمد ص.');
  });

  it('never returns an empty name', () => {
    expect(shortName('   ')).toBe('Partner');
  });
});
