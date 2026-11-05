/**
 * Services: api.ts
 * refreshSession saves each new refresh token; server error messages reach callers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import api, { refreshSession, getRefreshToken, saveRefreshToken, deleteRefreshToken } from '../../services/api';

const stored = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => { stored.set(key, value); },
  removeItem: (key: string) => { stored.delete(key); },
});

const tokens = (name: string) => ({ data: { accessToken: `access-${name}`, refreshToken: `refresh-${name}` } });

describe('refreshSession', () => {
  beforeEach(() => {
    deleteRefreshToken();
    saveRefreshToken('refresh-1');
  });

  afterEach(() => vi.restoreAllMocks());

  it('saves the new refresh token, so the next reload still works', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValueOnce(tokens('2')).mockResolvedValueOnce(tokens('3'));

    await expect(refreshSession()).resolves.toBe('access-2');
    expect(getRefreshToken()).toBe('refresh-2');

    await refreshSession();
    expect(post.mock.calls[1][1]).toEqual({ refreshToken: 'refresh-2' });
    expect(getRefreshToken()).toBe('refresh-3');
  });

  it('runs one exchange when called twice at once', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue(tokens('2'));

    await Promise.all([refreshSession(), refreshSession()]);

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('retries with the newer token when another tab replaced it', async () => {
    const post = vi.spyOn(axios, 'post')
      .mockImplementationOnce(async () => {
        saveRefreshToken('refresh-from-other-tab');
        throw new Error('401');
      })
      .mockResolvedValueOnce(tokens('3'));

    await expect(refreshSession()).resolves.toBe('access-3');
    expect(post.mock.calls[1][1]).toEqual({ refreshToken: 'refresh-from-other-tab' });
  });

  it('fails when the token is really no longer valid', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('401'));

    await expect(refreshSession()).rejects.toThrow('401');
  });

  it('fails without calling the server when no token is stored', async () => {
    deleteRefreshToken();
    const post = vi.spyOn(axios, 'post');

    await expect(refreshSession()).rejects.toThrow('No refresh token');
    expect(post).not.toHaveBeenCalled();
  });
});

describe('expired access token', () => {
  afterEach(() => vi.restoreAllMocks());

  it('refreshes and retries when changing the password', async () => {
    saveRefreshToken('refresh-1');
    const post = vi.spyOn(axios, 'post').mockResolvedValue(tokens('2'));
    let calls = 0;
    const adapter = (config: InternalAxiosRequestConfig) => {
      calls++;
      if (calls > 1) {
        return Promise.resolve({ data: { ok: true }, status: 200, statusText: '', headers: {}, config } as AxiosResponse);
      }
      return Promise.reject(
        new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
          data: { error: 'Invalid or expired token.' }, status: 401, statusText: '', headers: {}, config,
        } as AxiosResponse)
      );
    };

    const res = await api.post('/auth/change-password', {}, { adapter });

    expect(res.data).toEqual({ ok: true });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('does not try to refresh after a failed login', async () => {
    const post = vi.spyOn(axios, 'post');
    const adapter = (config: InternalAxiosRequestConfig) =>
      Promise.reject(
        new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
          data: { error: 'Invalid credentials.' }, status: 401, statusText: '', headers: {}, config,
        } as AxiosResponse)
      );

    await expect(api.post('/auth/login', {}, { adapter })).rejects.toThrow('Invalid credentials.');
    expect(post).not.toHaveBeenCalled();
  });
});

describe('server error messages', () => {
  const failingWith = (data: unknown, status = 400) => (config: InternalAxiosRequestConfig) =>
    Promise.reject(
      new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, null, {
        data, status, statusText: '', headers: {}, config,
      } as AxiosResponse)
    );

  it('uses the server message from a JSON response', async () => {
    const adapter = failingWith({ error: 'Paysheet already exists' });
    await expect(api.get('/auth/x', { adapter })).rejects.toThrow('Paysheet already exists');
  });

  it('uses the first detail when the server sends a list', async () => {
    const adapter = failingWith({ error: 'Validation failed', details: ['payMonth: wrong format'] });
    await expect(api.get('/auth/x', { adapter })).rejects.toThrow('payMonth: wrong format');
  });

  it('reads the message from a file download response', async () => {
    const adapter = failingWith(new Blob([JSON.stringify({ error: 'No data to export' })]));
    await expect(api.get('/auth/x', { adapter, responseType: 'blob' })).rejects.toThrow('No data to export');
  });

  it('keeps the normal message when the body is not JSON', async () => {
    const adapter = failingWith('<html>Bad gateway</html>', 502);
    await expect(api.get('/auth/x', { adapter })).rejects.toThrow('Request failed with status code 502');
  });
});
