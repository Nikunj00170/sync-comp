import { Capacitor } from '@capacitor/core';
import { UserManager, WebStorageStateStore, type StateStore } from 'oidc-client-ts';
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(k: string) {
    return this.items.get(k) ?? null;
  }
  key(i: number) {
    return [...this.items.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.items.delete(k);
  }
  setItem(k: string, v: string) {
    this.items.set(k, v);
  }
}
let manager: UserManager | undefined;
export function authManager() {
  const authority = import.meta.env.VITE_COGNITO_AUTHORITY;
  const client = import.meta.env.VITE_COGNITO_CLIENT_ID;
  if (!authority || !client || authority.includes('YOUR_') || client.includes('YOUR_'))
    throw new Error(
      'Account sign-in is not configured in this build. You can still explore the full demo.',
    );
  if (!manager)
    manager = new UserManager({
      authority,
      client_id: client,
      redirect_uri: import.meta.env.VITE_REDIRECT_URI || location.origin + '/',
      post_logout_redirect_uri: import.meta.env.VITE_LOGOUT_URI || location.origin + '/',
      response_type: 'code',
      scope: 'openid email',
      automaticSilentRenew: false,
      userStore: new WebStorageStateStore({ store: new MemoryStorage() }) as StateStore,
    });
  return manager;
}
export async function signIn() {
  if (Capacitor.isNativePlatform())
    throw new Error(
      'Native account sign-in will be enabled after the Android return link is configured. Your demo is ready to explore.',
    );
  const m = authManager();
  const returnOrigin = new URL(m.settings.redirect_uri).origin;
  if (returnOrigin !== location.origin)
    throw new Error(
      'Live sign-in is configured for the deployed website. Add this local return URL in Cognito before testing account sign-in here: ' +
        location.origin +
        '/',
    );
  await m.signinRedirect();
}
let callback: ReturnType<UserManager['signinRedirectCallback']> | undefined;
export function finishSignIn() {
  callback ??= authManager()
    .signinRedirectCallback()
    .then((user) => {
      history.replaceState({}, '', location.pathname + '#/account');
      return user;
    });
  return callback;
}
export async function signOut() {
  const m = authManager();
  const domain = import.meta.env.VITE_COGNITO_DOMAIN;
  if (!domain || domain.includes('YOUR_'))
    throw new Error('The Cognito logout domain is not configured.');
  const url = new URL('/logout', domain);
  url.searchParams.set('client_id', m.settings.client_id);
  url.searchParams.set('logout_uri', m.settings.post_logout_redirect_uri || location.origin + '/');
  await m.removeUser();
  location.assign(url.toString());
}
