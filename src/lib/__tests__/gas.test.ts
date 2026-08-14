import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectEnvironment, callGasViaHttp, runServerFunction } from '../gas';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

describe('gas.ts — detectEnvironment', () => {
  const originalGoogle = (globalThis as any).google;

  afterEach(() => {
    (globalThis as any).google = originalGoogle;
    vi.unstubAllEnvs();
  });

  it('harus mendeteksi environment "gas" jika google.script.run tersedia', () => {
    (globalThis as any).google = {
      script: {
        run: {
          withSuccessHandler: vi.fn(),
          withFailureHandler: vi.fn(),
        },
      },
    };

    expect(detectEnvironment()).toBe('gas');
  });

  it('harus mendeteksi environment "vercel" jika VITE_DEPLOY_TARGET="vercel"', () => {
    delete (globalThis as any).google;
    vi.stubEnv('VITE_DEPLOY_TARGET', 'vercel');

    expect(detectEnvironment()).toBe('vercel');
  });

  it('harus fallback ke "dev" jika bukan gas dan bukan vercel', () => {
    delete (globalThis as any).google;
    vi.stubEnv('VITE_DEPLOY_TARGET', 'gas'); // when not running inside google iframe, it falls back to dev unless vercel

    // In current code: if import.meta.env.VITE_DEPLOY_TARGET === 'vercel' -> 'vercel', else 'dev'
    expect(detectEnvironment()).toBe('dev');
  });
});

describe('gas.ts — callGasViaHttp (via MSW)', () => {
  it('harus berhasil memanggil /api/gas dan menerima response JSON', async () => {
    const res = await callGasViaHttp<{ success: boolean; data: any[] }>('getKatalogAlat');
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('harus melempar error jika status HTTP bukan 2xx (misal 500)', async () => {
    server.use(
      http.post('/api/gas', () => {
        return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
      })
    );

    await expect(callGasViaHttp('getKatalogAlat')).rejects.toThrow('HTTP error! status: 500');
  });
});

describe('gas.ts — runServerFunction in Dev Mode', () => {
  it('harus mengembalikan mock response untuk fungsi yang didukung', async () => {
    // In test environment without google.script and without vercel env, it runs dev mock
    const res = await runServerFunction('authenticatePetugas', 'admin', 'password');
    expect(res.success).toBe(true);
    expect(res.token).toBeDefined();
  });

  it('harus mengembalikan mock list katalog untuk getKatalogAlat', async () => {
    const res = await runServerFunction('getKatalogAlat');
    expect(res.success).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
  });

  it('harus menolak fungsi yang tidak terdaftar di mock dev handler', async () => {
    await expect(runServerFunction('fungsiTidakDikenal')).rejects.toThrow(/tidak memiliki mock data/i);
  });
});
