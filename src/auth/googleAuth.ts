const SCOPES = 'https://www.googleapis.com/auth/photoslibrary.readonly';

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  userName: string | null;
  userPhoto: string | null;
  error: string | null;
}

let tokenClient: any = null;
let authStateCallback: ((state: AuthState) => void) | null = null;
let currentAuthState: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  userName: null,
  userPhoto: null,
  error: null,
};

export function onAuthStateChange(callback: (state: AuthState) => void) {
  authStateCallback = callback;
  callback(currentAuthState);
}

export function getAuthState(): AuthState {
  return currentAuthState;
}

function updateAuthState(updates: Partial<AuthState>) {
  currentAuthState = { ...currentAuthState, ...updates };
  if (authStateCallback) {
    authStateCallback(currentAuthState);
  }
}

export async function initGoogleAuth(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Load Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const google = (window as any).google;
      if (!google) {
        reject(new Error('Google Identity Services failed to load'));
        return;
      }

      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) {
            updateAuthState({ error: response.error, isAuthenticated: false });
            return;
          }

          const token = response.access_token;
          updateAuthState({
            accessToken: token,
            isAuthenticated: true,
            error: null,
          });

          // Fetch user info
          fetchUserInfo(token);
        },
      });

      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

async function fetchUserInfo(token: string) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    updateAuthState({
      userName: data.name || data.email,
      userPhoto: data.picture,
    });
  } catch {
    // Non-critical, ignore
  }
}

export function requestLogin() {
  if (!tokenClient) {
    updateAuthState({ error: 'Google Auth not initialized. Please set your Client ID in Settings.' });
    return;
  }
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

export function logout() {
  if (currentAuthState.accessToken) {
    const google = (window as any).google;
    if (google?.accounts?.oauth2) {
      google.accounts.oauth2.revoke(currentAuthState.accessToken, () => {});
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

export function refreshToken() {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: '' });
  }
}
