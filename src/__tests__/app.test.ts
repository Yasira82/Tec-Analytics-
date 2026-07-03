import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Template Health', () => {
  it('environment is configured', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  // NEW-A: the internal gateway URL must never reach the browser. The client
  // sdk carries no gateway URL and no NEXT_PUBLIC_* gateway var / Railway host —
  // every gateway call goes through the server-only BFF (/api/bff/*).
  it('client sdk does not leak the internal gateway URL (NEW-A)', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/sdk.ts'), 'utf8');
    expect(src).not.toContain('NEXT_PUBLIC_API_GATEWAY_URL');
    expect(src).not.toMatch(/railway\.app/);
  });
});
