import { Capacitor } from '@capacitor/core';
import { UserManager, WebStorageStateStore, type StateStore } from 'oidc-client-ts';
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
      scope: import.meta.env.VITE_OIDC_SCOPE || 'openid email',
      automaticSilentRenew: true,
      userStore: new WebStorageStateStore({ store: sessionStorage }) as StateStore,
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

/** Access tokens, never ID tokens, authenticate API operations. Refresh before expiry. */
export async function accessToken() {
  const manager = authManager();
  let user = await manager.getUser();
  if (user && (user.expires_in ?? 0) < 60) {
    try {
      user = await manager.signinSilent();
    } catch {
      await manager.removeUser();
      throw new Error('Your session expired. Please sign in again.');
    }
  }
  if (!user || user.expired || !user.access_token)
    throw new Error('Please sign in to your customer account.');
  return user.access_token;
}
