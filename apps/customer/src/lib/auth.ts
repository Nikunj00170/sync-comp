import { Capacitor } from '@capacitor/core';
import { UserManager, WebStorageStateStore, type StateStore, type User } from 'oidc-client-ts';
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
      // All renewals go through the single-flight helper below, including timer events.
      automaticSilentRenew: false,
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

class SessionExpiredError extends Error {}
let renewing: Promise<User | null> | undefined;
let renewalBackoff: { subject: string; until: number } | undefined;
async function forgetExpiredSession(subject: string) {
  const manager = authManager();
  // A failed renewal from a previous account must never clear a newly signed-in account.
  if ((await manager.getUser())?.profile.sub === subject) await manager.removeUser();
}
/** Refresh once for concurrent callers. Temporary provider errors never erase the session. */
export async function accessToken(forceRefresh = false) {
  const manager = authManager();
  let user = await manager.getUser();
  if (!user) throw new Error('Please sign in to your customer account.');
  const subject = user.profile.sub;
  if (renewalBackoff?.subject === subject && renewalBackoff.until > Date.now()) {
    if (!user.expired && !forceRefresh && user.access_token) return user.access_token;
    throw new Error('Account renewal is temporarily unavailable. Please try again shortly.');
  }
  if ((forceRefresh || (user.expires_in ?? 0) < 60) && user.refresh_token) {
    renewing ??= manager
      .signinSilent()
      .catch(async (error: unknown) => {
        const code = (error as { error?: string })?.error;
        if (code && ['invalid_grant', 'login_required', 'interaction_required'].includes(code)) {
          await forgetExpiredSession(subject);
          throw new SessionExpiredError('Your session expired. Please sign in again.');
        }
        renewalBackoff = { subject, until: Date.now() + 15_000 };
        throw new Error('Account renewal is temporarily unavailable. Please try again shortly.');
      })
      .finally(() => {
        renewing = undefined;
      });
    try {
      user = await renewing;
      renewalBackoff = undefined;
    } catch (error) {
      if (
        !(error instanceof SessionExpiredError) &&
        !forceRefresh &&
        user &&
        !user.expired &&
        user.access_token
      )
        return user.access_token;
      throw error;
    }
  }
  if (!user || user.expired || !user.access_token) {
    await forgetExpiredSession(subject);
    throw new SessionExpiredError('Your session expired. Please sign in again.');
  }
  if (user.profile.sub !== subject || (await manager.getUser())?.profile.sub !== subject)
    throw new Error('Your account changed. Please try again.');
  return user.access_token;
}
