import { describe, it, expect } from '@jest/globals';

describe('AdminAntraegePage', () => {
  it('can be imported without throwing', async () => {
    // This is a basic smoke test to ensure the page file has no syntax errors
    // and can be imported without immediate errors
    expect(async () => {
      await import('../../../../app/admin/antraege/page');
    }).not.toThrow();
  });

  it('exports a default component', async () => {
    const module = await import('../../../../app/admin/antraege/page');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });
});