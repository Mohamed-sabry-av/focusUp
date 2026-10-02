import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safe-redirect';

describe('safeRedirectPath', () => {
  it('keeps paths inside the app', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath('/session/abc?x=1')).toBe('/session/abc?x=1');
  });

  it('falls back when there is no target', () => {
    expect(safeRedirectPath(null)).toBe('/dashboard');
    expect(safeRedirectPath(undefined)).toBe('/dashboard');
    expect(safeRedirectPath('')).toBe('/dashboard');
  });

  it('refuses other sites', () => {
    expect(safeRedirectPath('https://evil.example')).toBe('/dashboard');
    expect(safeRedirectPath('//evil.example')).toBe('/dashboard');
    expect(safeRedirectPath('/\\evil.example')).toBe('/dashboard');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/dashboard');
  });

  it('uses the given fallback', () => {
    expect(safeRedirectPath('https://evil.example', '/login')).toBe('/login');
  });
});
