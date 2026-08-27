import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Gallery } from './components/Gallery';
import { TagManager } from './components/TagManager';
import { PhotoDetail } from './components/PhotoDetail';
import { Settings } from './components/Settings';
import { AlbumsView } from './components/AlbumsView';
import { Tagger } from './components/Tagger';
import { photosApi } from './api/photosApi';
import { onAuthStateChange, requestLogin, logout, initGoogleAuth, getAuthState, type AuthState } from './auth/googleAuth';
import type { GPMediaItem, GPAlbum, AppView, Tag } from './types';
import { getPhotosByTag, getAllTags } from './db/database';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(getAuthState());
  const [currentView, setCurrentView] = useState<AppView>('gallery');
  const [mediaItems, setMediaItems] = useState<GPMediaItem[]>([]);
  const [albums, setAlbums] = useState<GPAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<GPMediaItem | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [taggedPhotoIds, setTaggedPhotoIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('gp_client_id') || '');
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // Auth state listener
  useEffect(() => {
    onAuthStateChange(setAuthState);
  }, []);

  // Init auth when client ID is set
  useEffect(() => {
    if (googleClientId) {
      localStorage.setItem('gp_client_id', googleClientId);
      initGoogleAuth(googleClientId).catch(err => {
        console.error('Auth init error:', err);
      });
    }
  }, [googleClientId]);

  // Update token in API client when auth changes
  useEffect(() => {
    if (authState.accessToken) {
      photosApi.setAccessToken(authState.accessToken);
    } else {
      photosApi.clearToken();
    }
  }, [authState.accessToken]);

  // Load tags
  const refreshTags = useCallback(async () => {
    const tags = await getAllTags();
    setAllTags(tags);
  }, []);

  useEffect(() => { refreshTags(); }, []);

  // Load tagged photos when selected tags change
  useEffect(() => {
    async function loadTaggedPhotos() {
      if (selectedTags.length === 0) {
        setTaggedPhotoIds(new Set());
        return;
      }
      const allIds = new Set<string>();
      for (const tagId of selectedTags) {
        const ids = await getPhotosByTag(tagId);
        ids.forEach(id => allIds.add(id));
      }
      setTaggedPhotoIds(allIds);
    }
    loadTaggedPhotos();
  }, [selectedTags]);

  // Load media items
  const loadMediaItems = useCallback(async (append: boolean = false) => {
    if (!authState.isAuthenticated) {
      console.log('[App] Not authenticated, skipping media load');
      return;
    }
    
    console.log('[App] === Starting media load ===');
    console.log('[App] Auth state:', { 
      hasToken: !!authState.accessToken, 
      tokenLength: authState.accessToken?.length || 0 
    });
    console.log('[App] Loading album:', selectedAlbum, 'append:', append);
    
    setLoading(true);
    try {
      let result;
      if (selectedAlbum) {
        console.log('[App] Searching within album:', selectedAlbum);
        result = await photosApi.searchMediaItems(selectedAlbum, append ? nextPageToken || undefined : undefined);
      } else {
        console.log('[App] Listing all media items');
        result = await photosApi.listMediaItems(50, append ? nextPageToken || undefined : undefined);
      }
      
      const items = result.mediaItems || [];
      console.log('[App] === Media load complete ===');
      console.log('[App] Received', items.length, 'items');
      console.log('[App] First item (if any):', items[0] ? JSON.stringify(items[0]).substring(0, 200) : 'none');
      console.log('[App] Next page token:', result.nextPageToken ? 'present' : 'none');
      
      setMediaItems(prev => append ? [...prev, ...items] : items);
      setNextPageToken(result.nextPageToken || null);
      
      if (items.length === 0 && !append) {
        console.warn('[App] ⚠️ No media items returned! Possible causes:');
        console.warn('[App]   1. API scope issue - check Google Cloud Console');
        console.warn('[App]   2. Empty library');
        console.warn('[App]   3. API rate limit');
      }
    } catch (err: any) {
      console.error('[App] ═══ API ERROR ═══');
      console.error('[App] Error type:', err.constructor.name);
      console.error('[App] Error message:', err.message);
      console.error('[App] Error details:', JSON.stringify(err, null, 2));
      console.error('[App] Stack trace:', err.stack);
      console.error('[App] ═══════════════');
    } finally {
      setLoading(false);
      console.log('[App] === Load finished, loading state:', false, '===');
    }
  }, [authState.isAuthenticated, authState.accessToken, selectedAlbum, nextPageToken]);

  // Load when auth changes or album changes
  useEffect(() => {
    if (authState.isAuthenticated) {
      setNextPageToken(null);
      loadMediaItems(false);
    } else {
      setMediaItems([]);
    }
  }, [authState.isAuthenticated, selectedAlbum]);

  // Load albums
  const loadAlbums = useCallback(async () => {
    if (!authState.isAuthenticated) return;
    try {
      const result = await photosApi.listAlbums(50);
      setAlbums(result.albums || []);
    } catch (err) {
      console.error('Failed to load albums:', err);
    }
  }, [authState.isAuthenticated]);

  // Filter items by search and tags
  const filteredItems = mediaItems.filter(item => {
    if (selectedTags.length > 0 && !taggedPhotoIds.has(item.id)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.filename?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleLogin = () => requestLogin();
  const handleLogout = () => {
    logout();
    setMediaItems([]);
    setAlbums([]);
    setCurrentView('gallery');
  };

  const handleSelectAlbum = (albumId: string | null) => {
    setSelectedAlbum(albumId);
    setNextPageToken(null);
    if (albumId) setCurrentView('gallery');
  };

  const handleLoadMore = () => {
    if (nextPageToken && !loading) {
      loadMediaItems(true);
    }
  };

  // Setup screen (shown before auth, or when user navigates to settings)
  const showSetup = !authState.isAuthenticated;
  const showSettingsInline = showSetup && currentView === 'settings';

  // Login / setup screen
  if (!authState.isAuthenticated && !showSettingsInline) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'var(--color-bg-primary)' }}>
        {/* Settings panel accessible from login */}
        {currentView === 'settings' ? (
          <div className="w-full max-w-2xl">
            <Settings
              googleClientId={googleClientId}
              onClientIdChange={setGoogleClientId}
            />
            <div className="mt-4 text-center">
              <button
                onClick={() => setCurrentView('gallery')}
                className="px-6 py-2 rounded-lg text-sm cursor-pointer"
                style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
              >
                ← Back to Login
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-md w-full rounded-xl p-8" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">📸</div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Stash Photos
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Tag & organize your Google Photos
              </p>
            </div>

            {!googleClientId ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg text-sm" style={{ background: 'var(--color-bg-tertiary)' }}>
                  <p className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>Setup Required</p>
                  <p className="mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                    To connect to Google Photos, you need a Google Cloud OAuth 2.0 Client ID.
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <li>Go to <a href="https://console.cloud.google.com" target="_blank" className="underline" style={{ color: 'var(--color-accent)' }}>Google Cloud Console</a></li>
                    <li>Create a project (or select one)</li>
                    <li>Enable "Photos Library API"</li>
                    <li>Create OAuth 2.0 credentials (Web application)</li>
                    <li>Add this origin to authorized JavaScript origins</li>
                  </ol>
                </div>
                <button
                  onClick={() => setCurrentView('settings')}
                  className="w-full py-3 rounded-lg font-medium text-white cursor-pointer"
                  style={{ background: 'var(--color-accent)' }}
                >
                  Configure Client ID →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
                  Connected to Google Cloud. Sign in to access your photos.
                </p>
                <button
                  onClick={handleLogin}
                  className="w-full py-3 rounded-lg font-medium text-white cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: 'var(--color-accent)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
                  Sign in with Google
                </button>
                {authState.error && (
                  <p className="text-sm text-center" style={{ color: 'var(--color-danger)' }}>{authState.error}</p>
                )}
                <button
                  onClick={() => { setGoogleClientId(''); localStorage.removeItem('gp_client_id'); }}
                  className="w-full py-2 text-sm cursor-pointer"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Change Client ID
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg-primary)' }}>
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        userName={authState.userName}
        userPhoto={authState.userPhoto}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTag={(tagId) => {
          setSelectedTags(prev =>
            prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
          );
        }}
        onClearTags={() => setSelectedTags([])}
      />

      <main className="flex-1 overflow-auto">
        {currentView === 'gallery' && (
          <Gallery
            items={filteredItems}
            loading={loading}
            hasMore={!!nextPageToken}
            onLoadMore={handleLoadMore}
            onSelectPhoto={setSelectedPhoto}
            selectedAlbum={selectedAlbum}
            albums={albums}
            onSelectAlbum={handleSelectAlbum}
            taggedPhotoIds={taggedPhotoIds}
          />
        )}
        {currentView === 'tags' && (
          <TagManager
            onTagsChange={refreshTags}
            allTags={allTags}
          />
        )}
        {currentView === 'albums' && (
          <AlbumsView
            albums={albums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={handleSelectAlbum}
            onLoadAlbums={loadAlbums}
          />
        )}
        {currentView === 'tagger' && (
          <Tagger
            items={mediaItems}
            onTagsChange={refreshTags}
          />
        )}
        {currentView === 'settings' && (
          <Settings
            googleClientId={googleClientId}
            onClientIdChange={setGoogleClientId}
          />
        )}
      </main>

      {selectedPhoto && (
        <PhotoDetail
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onRefreshTags={refreshTags}
        />
      )}
    </div>
  );
}
