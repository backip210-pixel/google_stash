import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

const SCOPES = 'https://www.googleapis.com/auth/photoslibrary';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
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
let statusBarConfigured = false;

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

/**
 * Configure native status bar — dark text on light background or transparent
 */
async function configureStatusBar() {
  if (statusBarConfigured || !isNativePlatform()) return;
  statusBarConfigured = true;
  try {
    // Make status bar transparent so our dark theme shows through
    await StatusBar.setBackgroundColor({ color: '#0d1117' });
    await StatusBar.setStyle({ style: Style.Dark });
    // Show the status bar
    await StatusBar.show();
  } catch (err) {
    console.warn('StatusBar config failed:', err);
  }
}

function updateAuthState(updates: Partial<AuthState>) {
  currentAuthState = { ...currentAuthState, ...updates };
  if (authStateCallback) {
    authStateCallback(currentAuthState);
  }
}

function setupDeepLinkListener() {
  if (deepLinkSetup) return;
  deepLinkSetup = true;

  App.addListener('appUrlOpen', (data: { url: string }) => {
    const url = data.url;
    console.log('[Auth] Deep link received, full length:', url.length);
    console.log('[Auth] Deep link preview:', url.substring(0, 150));
    
    if (url.startsWith('stashphotos://auth')) {
      const queryString = url.split('?')[1] || '';
      console.log('[Auth] Query string:', queryString.substring(0, 100));
      
      const params = new URLSearchParams(queryString);
      const token = params.get('access_token');
      const error = params.get('error');
      
      if (error) {
        console.error('[Auth] OAuth error:', error);
        updateAuthState({ error: `OAuth error: ${error}` });
        return;
      }
      
      if (token) {
        // URLSearchParams.get() already decodes the token, so use it as-is
        console.log('[Auth] Token captured, length:', token.length);
        console.log('[Auth] Token preview:', token.substring(0, 50) + '...');
        console.log('[Auth] Captured at:', new Date().toISOString());
        
        deepLinkToken = token;
        updateAuthState({
          accessToken: token,
          isAuthenticated: true,
          error: null,
        });
        fetchUserInfo(token);
      } else {
        console.error('[Auth] No access_token in deep link');
        updateAuthState({ error: 'No token received from Google' });
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
  if (deepLinkToken) {
    currentAuthState.accessToken = deepLinkToken;
    currentAuthState.isAuthenticated = true;
  }
  // Configure status bar on first callback
  configureStatusBar();
  callback(currentAuthState);
}

export function getAuthState(): AuthState {
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
  configureStatusBar();
  return currentAuthState;
}

export async function initGoogleAuth(clientId: string): Promise<void> {
  const native = isNativePlatform();
  updateAuthState({ isNative: native, error: null });
  configureStatusBar();

  if (native) {
    setupDeepLinkListener();
  } else {
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

export function requestLogin() {
  const clientId = localStorage.getItem('gp_client_id');
  if (!clientId) {
    updateAuthState({ error: 'Please configure your Client ID in Settings first.' });
    return;
  }

  const native = isNativePlatform();
  if (native) {
    loginNative(clientId);
  } else {
    loginWeb(clientId);
  }
}

function loginNative(clientId: string) {
  const authUrl = `${GOOGLE_AUTH_URL}?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    scope: SCOPES,
    access_type: 'online',
    prompt: 'consent',
  }).toString();

  import('@capacitor/browser').then(({ Browser }) => {
    Browser.open({
      url: authUrl,
      presentationStyle: 'fullscreen',
    }).catch(err => {
      updateAuthState({ error: `Failed to open sign-in: ${err.message}` });
    });
  }).catch(() => {
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
  const authUrl = `${GOOGLE_AUTH_URL}?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: window.location.origin,
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
