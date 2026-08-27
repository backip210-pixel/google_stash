import { App } from '@capacitor/app';

const SCOPES = 'https://www.googleapis.com/auth/photoslibrary.readonly';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

// GitHub Pages redirect page URL (configured in Google Cloud Console redirect URIs)
const REDIRECT_URI = 'https://backip210-pixel.github.io/google_stash/oauth-redirect.html';

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  userName: string | null;
  userPhoto: string | null;
  error: string | null;
  isNative: boolean;
}

let authStateCallback: ((state: AuthState) => void) | null = null;
let deepLinkToken: string | null = null;
let deepLinkSetup = false;

let currentAuthState: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  userName: null,
  userPhoto: null,
  error: null,
  isNative: false,
};

function isNativePlatform(): boolean {
  try {
    return typeof (window as any).Capacitor !== 'undefined' &&
      (window as any).Capacitor.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

function updateAuthState(updates: Partial<AuthState>) {
  currentAuthState = { ...currentAuthState, ...updates };
  if (authStateCallback) {
    authStateCallback(currentAuthState);
  }
}

/**
 * Set up deep link listener for native app
 * Listens for stashphotos://auth?access_token=XXX
 */
function setupDeepLinkListener() {
  if (deepLinkSetup) return;
  deepLinkSetup = true;

  App.addListener('appUrlOpen', (data: { url: string }) => {
    const url = data.url;
    // Parse stashphotos://auth?access_token=XXX
    if (url.startsWith('stashphotos://auth')) {
      const params = new URLSearchParams(url.split('?')[1] || '');
      const token = params.get('access_token');
      if (token) {
        deepLinkToken = token;
        updateAuthState({
          accessToken: token,
          isAuthenticated: true,
          error: null,
        });
        fetchUserInfo(token);
      }
    }
  });
}

async function fetchUserInfo(token: string) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const data = await response.json();
    updateAuthState({
      userName: data.name || data.email,
      userPhoto: data.picture,
    });
  } catch {
    // Non-critical
  }
}

export function onAuthStateChange(callback: (state: AuthState) => void) {
  authStateCallback = callback;
  // Check for deep link token
  if (deepLinkToken) {
    currentAuthState.accessToken = deepLinkToken;
    currentAuthState.isAuthenticated = true;
  }
  callback(currentAuthState);
}

export function getAuthState(): AuthState {
  // Check for token in URL hash (web redirect fallback)
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    if (token) {
      currentAuthState.accessToken = token;
      currentAuthState.isAuthenticated = true;
      currentAuthState.error = null;
      window.history.replaceState(null, '', window.location.pathname);
      fetchUserInfo(token);
    }
  }
  return currentAuthState;
}

export async function initGoogleAuth(clientId: string): Promise<void> {
  const native = isNativePlatform();
  updateAuthState({ isNative: native, error: null });

  if (native) {
    setupDeepLinkListener();
  } else {
    // Web: preload GIS library
    try {
      await loadGISScript();
    } catch {
      // Not fatal
    }
  }
}

function loadGISScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google) resolve();
      else reject(new Error('Google script loaded but API not found'));
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

export function getRequiredOrigin(): string {
  if (isNativePlatform()) {
    return 'https://localhost';
  }
  return window.location.origin;
}

/**
 * Request login — uses appropriate method for platform
 */
export function requestLogin() {
  const clientId = localStorage.getItem('gp_client_id');
  if (!clientId) {
    updateAuthState({ error: 'Please configure your Client ID in Settings first.' });
    return;
  }

  const native = isNativePlatform();

  if (native) {
    // NATIVE: Open OAuth in Chrome Custom Tab, redirect goes through GitHub Pages page
    loginNative(clientId);
  } else {
    // WEB: Try GIS popup first, fall back to redirect
    loginWeb(clientId);
  }
}

function loginNative(clientId: string) {
  // Open Google OAuth in Capacitor Browser (Chrome Custom Tab)
  // The redirect_uri points to our GitHub Pages page which passes the token back via deep link
  const authUrl = `${GOOGLE_AUTH_URL}?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    scope: SCOPES,
    access_type: 'online',
    prompt: 'consent',
  }).toString();

  // Open in Chrome Custom Tab via Capacitor Browser
  import('@capacitor/browser').then(({ Browser }) => {
    Browser.open({
      url: authUrl,
      presentationStyle: 'fullscreen',
    }).then(() => {
      // Browser opened — the deep link listener will handle the token
    }).catch(err => {
      updateAuthState({ error: `Failed to open sign-in: ${err.message}` });
    });
  }).catch(() => {
    // Browser plugin not available, fall back to full-page redirect
    window.location.href = authUrl;
  });
}

function loginWeb(clientId: string) {
  const google = (window as any).google;
  if (google?.accounts?.oauth2) {
    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) {
            // Fallback to redirect
            doWebRedirect(clientId);
            return;
          }
          updateAuthState({
            accessToken: response.access_token,
            isAuthenticated: true,
            error: null,
          });
          fetchUserInfo(response.access_token);
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
      return;
    } catch {
      // Fall through
    }
  }
  doWebRedirect(clientId);
}

function doWebRedirect(clientId: string) {
  const redirectUri = window.location.origin;
  const authUrl = `${GOOGLE_AUTH_URL}?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: SCOPES,
    access_type: 'online',
    prompt: 'consent',
  }).toString();
  window.location.href = authUrl;
}

export function logout() {
  if (currentAuthState.accessToken) {
    try {
      fetch(`https://accounts.google.com/o/oauth2/revoke?token=${currentAuthState.accessToken}`)
        .catch(() => {});
    } catch {}

    const google = (window as any).google;
    if (google?.accounts?.oauth2) {
      try {
        google.accounts.oauth2.revoke(currentAuthState.accessToken, () => {});
      } catch {}
    }
  }

  updateAuthState({
    isAuthenticated: false,
    accessToken: null,
    userName: null,
    userPhoto: null,
    error: null,
  });
}
