import { beforeEach, afterEach, test, expect, vi } from 'vitest';
const state = vi.hoisted(() => {
  type User = {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    expired: boolean;
    profile: { sub: string };
  };
  const state = { user: null as User | null };
  const manager = {
    getUser: vi.fn(async () => state.user),
    signinSilent: vi.fn<() => Promise<User | null>>(),
    removeUser: vi.fn(async () => {
      state.user = null;
    }),
    settings: {} as Record<string, unknown>,
  };
  return { state, manager };
});
vi.mock('oidc-client-ts', () => ({
  UserManager: vi.fn(function (options) {
    state.manager.settings = options;
    return state.manager;
  }),
  WebStorageStateStore: class {},
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('VITE_COGNITO_AUTHORITY', 'https://issuer.example');
  vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'client');
  vi.stubGlobal('location', { origin: 'http://localhost:5173', pathname: '/' });
  vi.stubGlobal('sessionStorage', {});
  state.state.user = {
    access_token: 'old-access',
    refresh_token: 'refresh',
    expires_in: 20,
    expired: false,
    profile: { sub: 'one' },
  };
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
test('parallel API callers share one refresh and disable competing background renewal', async () => {
  let release!: (user: NonNullable<typeof state.state.user>) => void;
  state.manager.signinSilent.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const { accessToken } = await import('../apps/customer/src/lib/auth');
  const calls = Promise.all(Array.from({ length: 8 }, () => accessToken()));
  await vi.waitFor(() => expect(state.manager.signinSilent).toHaveBeenCalledTimes(1));
  state.state.user = { ...state.state.user!, access_token: 'new-access', expires_in: 3600 };
  release(state.state.user);
  expect(await calls).toEqual(Array(8).fill('new-access'));
  expect(state.manager.settings.automaticSilentRenew).toBe(false);
});
test('refresh throttling keeps a still-valid token and never signs out', async () => {
  state.manager.signinSilent.mockRejectedValue({ status: 429 });
  const { accessToken } = await import('../apps/customer/src/lib/auth');
  expect(await accessToken()).toBe('old-access');
  expect(await Promise.all(Array.from({ length: 5 }, () => accessToken()))).toEqual(
    Array(5).fill('old-access'),
  );
  expect(state.manager.signinSilent).toHaveBeenCalledTimes(1);
  expect(state.manager.removeUser).not.toHaveBeenCalled();
});
test('expired-token refresh throttling is recoverable without deleting the Cognito session', async () => {
  state.state.user!.expired = true;
  state.state.user!.expires_in = -1;
  state.manager.signinSilent.mockRejectedValue({ status: 429 });
  const { accessToken } = await import('../apps/customer/src/lib/auth');
  await expect(accessToken()).rejects.toThrow('temporarily unavailable');
  expect(state.manager.removeUser).not.toHaveBeenCalled();
});
test('a revoked refresh token requires sign-in and cannot fall back to an old access token', async () => {
  state.manager.signinSilent.mockRejectedValue({ error: 'invalid_grant' });
  const { accessToken } = await import('../apps/customer/src/lib/auth');
  await expect(accessToken()).rejects.toThrow('session expired');
  expect(state.manager.removeUser).toHaveBeenCalledTimes(1);
});
test('an expired session without a refresh token requires sign-in', async () => {
  state.state.user = {
    ...state.state.user!,
    refresh_token: undefined,
    expired: true,
    expires_in: -1,
  };
  const { accessToken } = await import('../apps/customer/src/lib/auth');
  await expect(accessToken()).rejects.toThrow('session expired');
  expect(state.manager.signinSilent).not.toHaveBeenCalled();
});

test('a new account cannot receive the access token from a previous account renewal', async () => {
  const previous = { ...state.state.user!, access_token: 'renewed-old-account', expires_in: 3600 };
  let release!: (user: NonNullable<typeof state.state.user>) => void;
  state.manager.signinSilent.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const { accessToken } = await import('../apps/customer/src/lib/auth');
  const first = accessToken().catch((error) => error);
  await vi.waitFor(() => expect(state.manager.signinSilent).toHaveBeenCalledTimes(1));
  state.state.user = { ...state.state.user!, profile: { sub: 'two' } };
  const second = accessToken().catch((error) => error);
  await Promise.resolve();
  release(previous);
  expect(await first).toBeInstanceOf(Error);
  expect(await second).toBeInstanceOf(Error);
  expect(state.manager.removeUser).not.toHaveBeenCalled();
});
