const SCOPES = 'https://www.googleapis.com/auth/photoslibrary.readonly';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  userName: string | null;
  userPhoto: string | null;
  error: string | null;
  isNative: boolean;
}

let authStateCallback: ((state: AuthState) => void) | null = null;
let currentAuthState: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  userName: null,
  userPhoto: null,
  error: null,
  isNative: false,
};

// Detect if running inside Capacitor native app
function isNativePlatform(): boolean {
  try {
    return typeof (window as any).Capacitor !== 'undefined' &&
      (window as any).Capacitor.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

export function onAuthStateChange(callback: (state: AuthState) => void) {
  authStateCallback = callback;
  callback(currentAuthState);
}

export function getAuthState(): AuthState {
  // Check for token in URL hash (redirect back from Google OAuth)
  const hashToken = getTokenFromHash();
  if (hashToken) {
    currentAuthState.accessToken = hashToken;
    currentAuthState.isAuthenticated = true;
    currentAuthState.error = null;
    // Clean up the URL
    window.history.replaceState(null, '', window.location.pathname);
    // Fetch user info
    fetchUserInfo(hashToken);
  }

  // Check for error in URL hash (OAuth error redirect)
  const hashError = getErrorFromHash();
  if (hashError && !hashToken) {
    currentAuthState.error = hashError;
  }

  return currentAuthState;
}

function getTokenFromHash(): string | null {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return null;
  const params = new URLSearchParams(hash.substring(1));
  return params.get('access_token');
}

function getErrorFromHash(): string | null {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return null;
  const params = new URLSearchParams(hash.substring(1));
  const error = params.get('error');
  const desc = params.get('error_description');
  if (error) return desc || error;
  return null;
}

function updateAuthState(updates: Partial<AuthState>) {
  currentAuthState = { ...currentAuthState, ...updates };
  if (authStateCallback) {
    authStateCallback(currentAuthState);
  }
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

/**
 * Initialize auth — call this when Client ID is set or changed
 */
export async function initGoogleAuth(clientId: string): Promise<void> {
  const native = isNativePlatform();
  updateAuthState({ isNative: native, error: null });

  // For web: preload the Google Identity Services library for faster popup auth
  if (!native) {
    try {
      await loadGISScript();
    } catch (err: any) {
      // Not fatal — we can still use redirect flow
      console.warn('GIS script failed to load, will use redirect flow:', err.message);
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

/**
 * Get the redirect URI for the current platform
 */
export function getRedirectUri(): string {
  if (isNativePlatform()) {
    return 'https://localhost';
  }
  return window.location.origin;
}

/**
 * Get the required origin for Google Cloud Console
 */
export function getRequiredOrigin(): string {
  return getRedirectUri();
}

/**
 * Request login — uses full-page redirect (works in both web and Capacitor)
 */
export function requestLogin() {
  const clientId = localStorage.getItem('gp_client_id');
  if (!clientId) {
    updateAuthState({ error: 'Please configure your Client ID in Settings first.' });
    return;
  }

  // First try the GIS popup flow (web only, better UX)
  if (!isNativePlatform()) {
    const google = (window as any).google;
    if (google?.accounts?.oauth2) {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.error) {
              // Fallback to redirect flow
              doRedirectLogin(clientId);
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
        // Fall through to redirect flow
      }
    }
  }

  // Redirect flow (works everywhere, including Capacitor native)
  doRedirectLogin(clientId);
}

function doRedirectLogin(clientId: string) {
  const redirectUri = getRedirectUri();

  const authUrl = `${GOOGLE_AUTH_URL}?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: SCOPES,
    access_type: 'online',
    prompt: 'consent',
  }).toString();

  // Full-page redirect to Google OAuth
  window.location.href = authUrl;
}

export function logout() {
  // Revoke token
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

  // Also clear any stored state
  localStorage.removeItem('auth_state');
}
