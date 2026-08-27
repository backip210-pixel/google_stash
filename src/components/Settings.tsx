import { useState } from 'react';
import { Save, ExternalLink, Info, Shield, Database } from 'lucide-react';
import { tpdbApi } from '../api/tpdbApi';
import { getRequiredOrigin } from '../auth/googleAuth';

interface SettingsProps {
  googleClientId: string;
  onClientIdChange: (id: string) => void;
}

export function Settings({ googleClientId, onClientIdChange }: SettingsProps) {
  const [clientIdInput, setClientIdInput] = useState(googleClientId);
  const [tpdbKeyInput, setTpdbKeyInput] = useState(tpdbApi.getApiKey() || '');
  const [saved, setSaved] = useState(false);
  const [tpdbSaved, setTpdbSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  async function handleTestApi() {
    setTestResult({ success: false, message: 'Testing...' });
    try {
      const { photosApi } = await import('../api/photosApi');
      const { getAuthState } = await import('../auth/googleAuth');
      const authState = getAuthState();
      
      if (!authState.accessToken) {
        setTestResult({ 
          success: false, 
          message: 'Not signed in. Please sign in with Google first.' 
        });
        return;
      }

      console.log('[Test API] Starting API test...');
      const result = await photosApi.listMediaItems(5);
      
      console.log('[Test API] Result:', result);
      setTestResult({
        success: true,
        message: `Success! Found ${result.mediaItems?.length || 0} items.`,
        details: result
      });
    } catch (err: any) {
      console.error('[Test API] Error:', err);
      setTestResult({
        success: false,
        message: `Error: ${err.message}`,
        details: err
      });
    }
  }

  function handleSave() {
    onClientIdChange(clientIdInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleSaveTpdb() {
    const key = tpdbKeyInput.trim();
    if (key) {
      tpdbApi.setApiKey(key);
    } else {
      tpdbApi.clearApiKey();
    }
    setTpdbSaved(true);
    setTimeout(() => setTpdbSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
        Settings
      </h2>

      {/* Google Cloud Setup */}
      <div className="rounded-xl p-5" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Shield size={16} />
          Google Photos API Configuration
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              OAuth 2.0 Client ID
            </label>
            <input
              type="text"
              value={clientIdInput}
              onChange={(e) => setClientIdInput(e.target.value)}
              placeholder="xxxxxxx.apps.googleusercontent.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none"
              style={{
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            />
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer flex items-center gap-2"
            style={{ background: saved ? 'var(--color-success)' : 'var(--color-accent)' }}
          >
            <Save size={14} />
            {saved ? 'Saved!' : 'Save Client ID'}
          </button>
        </div>

        <div className="mt-5 p-4 rounded-lg" style={{ background: 'var(--color-bg-tertiary)' }}>
          <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
            <Info size={12} />
            How to get a Client ID
          </h4>
          <ol className="text-xs space-y-1.5 list-decimal list-inside" style={{ color: 'var(--color-text-secondary)' }}>
            <li>
              Go to{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                className="underline"
                style={{ color: 'var(--color-accent)' }}
              >
                Google Cloud Console → Credentials
              </a>
            </li>
            <li>Create a new project (or select existing)</li>
            <li>
              Enable the{' '}
              <a
                href="https://console.cloud.google.com/apis/library/photoslibrary.googleapis.com"
                target="_blank"
                className="underline"
                style={{ color: 'var(--color-accent)' }}
              >
                Photos Library API
              </a>
            </li>
            <li>Configure the OAuth consent screen (External / Test mode is fine)</li>
            <li>Create credentials → OAuth 2.0 Client ID → Web application</li>
            <li>
              Add <strong>ALL</strong> of these as authorized JavaScript origins:
              <code className="block mt-1 px-2 py-1 rounded text-xs" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-accent)' }}>
                {getRequiredOrigin()}
              </code>
              <code className="block mt-1 px-2 py-1 rounded text-xs" style={{ background: 'var(--color-bg-secondary)', color: '#bc8cff' }}>
                https://localhost
              </code>
              <code className="block mt-1 px-2 py-1 rounded text-xs" style={{ background: 'var(--color-bg-secondary)', color: '#56d364' }}>
                http://localhost
              </code>
            </li>
            <li>Copy the Client ID and paste it above</li>
          </ol>
        </div>
      </div>

      {/* ThePornDB Scraper */}
      <div className="rounded-xl p-5" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Database size={16} />
          ThePornDB — Auto Tagger
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              ThePornDB API Key
            </label>
            <input
              type="password"
              value={tpdbKeyInput}
              onChange={(e) => setTpdbKeyInput(e.target.value)}
              placeholder="Enter your API key from theporndb.net"
              className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none"
              style={{
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            />
          </div>

          <button
            onClick={handleSaveTpdb}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer flex items-center gap-2"
            style={{ background: tpdbSaved ? 'var(--color-success)' : 'var(--color-accent)' }}
          >
            <Save size={14} />
            {tpdbSaved ? 'Saved!' : 'Save API Key'}
          </button>
        </div>

        <div className="mt-5 p-4 rounded-lg" style={{ background: 'var(--color-bg-tertiary)' }}>
          <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
            <Info size={12} />
            How to get a ThePornDB API Key
          </h4>
          <ol className="text-xs space-y-1.5 list-decimal list-inside" style={{ color: 'var(--color-text-secondary)' }}>
            <li>
              Create an account at{' '}
              <a href="https://theporndb.net" target="_blank" className="underline" style={{ color: 'var(--color-accent)' }}>
                theporndb.net
              </a>
            </li>
            <li>Go to your account → API Tokens</li>
            <li>Create a new token with <strong>Read</strong> permission</li>
            <li>Copy the token and paste it above</li>
          </ol>
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-secondary)' }}>
            The Tagger will use filenames to search ThePornDB and automatically apply
            performer, studio, and category tags to your photos.
          </p>
        </div>
      </div>

      {/* API Test Button */}
      {googleClientId && (
        <div className="rounded-xl p-5" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            🔍 API Connection Test
          </h3>
          <button
            onClick={handleTestApi}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
            style={{ background: 'var(--color-accent)' }}
          >
            Test Google Photos API
          </button>
          {testResult && (
            <div className="mt-3 p-3 rounded-lg text-xs" style={{ 
              background: testResult.success ? 'rgba(63, 185, 80, 0.1)' : 'rgba(248, 81, 73, 0.1)',
              border: `1px solid ${testResult.success ? 'var(--color-success)' : 'var(--color-danger)'}`
            }}>
              <p style={{ color: testResult.success ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {testResult.message}
              </p>
              {testResult.details && (
                <pre className="mt-2 p-2 rounded overflow-x-auto" style={{ background: 'var(--color-bg-tertiary)', fontSize: '10px' }}>
                  {JSON.stringify(testResult.details, null, 2)}
                </pre>
              )}
            </div>
          )}
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            If this fails, check the browser console (F12) for detailed error logs.
          </p>
        </div>
      )}

      {/* Google Sign-In Redirect URI */}
      {googleClientId && (
        <div className="rounded-xl p-5" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <ExternalLink size={16} />
            Android APK — Sign-In Setup
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            The APK uses a hosted redirect page to pass the auth token back to the app.
            You need to do <strong>2 things</strong> in Google Cloud Console:
          </p>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            1. Add this as an <strong>Authorized redirect URI</strong>:
          </p>
          <code className="block p-3 rounded-lg text-xs mb-4 break-all" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}>
            https://backip210-pixel.github.io/google_stash/oauth-redirect.html
          </code>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            2. Enable GitHub Pages on this repo (so the redirect page is live):
          </p>
          <ol className="text-xs space-y-1 list-decimal list-inside mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            <li>Go to <a href="https://github.com/backip210-pixel/google_stash/settings/pages" target="_blank" className="underline" style={{ color: 'var(--color-accent)' }}>Settings → Pages</a></li>
            <li>Source: <strong>Deploy from a branch</strong></li>
            <li>Branch: <strong>main</strong> / Folder: <strong>/ (root)</strong></li>
            <li>Click <strong>Save</strong></li>
          </ol>
          <p className="text-xs p-2 rounded" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
            Once enabled, your redirect page will be live at the URL above.
            Also add your user email as a <strong>test user</strong> under the Audience tab.
          </p>
        </div>
      )}

      {/* Data Management */}
      <div className="rounded-xl p-5" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Data Management
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Tags, categories, ratings, and notes are stored locally in your browser using IndexedDB.
          No data is sent to any server other than Google Photos for fetching your library.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (confirm('This will export all your tags and associations as a JSON file. Continue?')) {
                exportData();
              }
            }}
            className="px-4 py-2 rounded-lg text-sm cursor-pointer"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
          >
            Export Data
          </button>
          <button
            onClick={() => {
              if (confirm('⚠️ This will delete ALL local data including tags, ratings, and notes. This cannot be undone. Continue?')) {
                clearAllData();
              }
            }}
            className="px-4 py-2 rounded-lg text-sm cursor-pointer"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}
          >
            Clear All Data
          </button>
        </div>
      </div>

      {/* About */}
      <div className="rounded-xl p-5" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
          About Stash Photos
        </h3>
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          A Google Photos tagging and organization PWA inspired by{' '}
          <a
            href="https://github.com/stashapp/stash"
            target="_blank"
            className="underline"
            style={{ color: 'var(--color-accent)' }}
          >
            Stash
          </a>.
          Browse your Google Photos library and organize them with custom tags, categories,
          ratings, and notes. Install as a PWA on Android for a native app experience.
        </p>
      </div>
    </div>
  );
}

async function exportData() {
  const { db } = await import('../db/database');
  const [tags, categories, photoTags, metadata] = await Promise.all([
    db.tags.toArray(),
    db.tagCategories.toArray(),
    db.photoTags.toArray(),
    db.photoMetadata.toArray(),
  ]);

  const data = { tags, categories, photoTags, metadata, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stash-photos-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function clearAllData() {
  const { db } = await import('../db/database');
  await Promise.all([
    db.tags.clear(),
    db.tagCategories.clear(),
    db.photoTags.clear(),
    db.photoMetadata.clear(),
  ]);
  window.location.reload();
}
