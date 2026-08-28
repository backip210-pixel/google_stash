import type { GPMediaItem, GPAlbum, GPListResponse } from '../types';

const PHOTOS_API_BASE = 'https://photoslibrary.googleapis.com/v1';

export class PhotosApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  clearToken() {
    this.accessToken = null;
  }

  private lastRequestDetails: { url?: string; headers?: any; error?: any } = {};

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) {
      console.error('[PhotosAPI] ══ NO ACCESS TOKEN ═══');
      console.error('[PhotosAPI] This means auth completed but token was not saved');
      throw new Error('Not authenticated - no access token available');
    }

    console.log('[PhotosAPI] Making request:', endpoint);
    console.log('[PhotosAPI] Method:', options.method || 'GET');
    console.log('[PhotosAPI] Token length:', this.accessToken.length);
    console.log('[PhotosAPI] Token preview:', this.accessToken.substring(0, 30) + '...');
    
    const url = `${PHOTOS_API_BASE}${endpoint}`;
    console.log('[PhotosAPI] Full URL:', url);
    
    // Log the exact headers being sent
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };
    console.log('[PhotosAPI] Authorization header:', `Bearer ${this.accessToken.substring(0, 30)}...`);
    
    // Store request details for diagnostics
    this.lastRequestDetails = {
      url,
      headers: {
        'Authorization': 'Bearer [REDACTED]',
        'Content-Type': 'application/json',
      }
    };
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('[PhotosAPI] Response status:', response.status, response.statusText);
    console.log('[PhotosAPI] Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PhotosAPI] ═══ API ERROR RESPONSE ═══');
      console.error('[PhotosAPI] Status:', response.status);
      console.error('[PhotosAPI] Response body:', errorText);
      console.error('[PhotosAPI] ════════════════════════');
      
      let error;
      try {
        error = JSON.parse(errorText);
        console.error('[PhotosAPI] Parsed error:', JSON.stringify(error, null, 2));
      } catch {
        error = { error: { message: response.statusText } };
      }
      
      this.lastRequestDetails.error = error;
      
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    console.log('[PhotosAPI] Response OK');
    return response;
  }

  getLastRequestDetails() {
    return this.lastRequestDetails;
  }

  /**
   * Validate the token by calling tokeninfo endpoint
   * This gives us more details than the userinfo endpoint
   */
  async validateToken(): Promise<{ email?: string; scope?: string; expires_in?: number; audience?: string }> {
    if (!this.accessToken) {
      throw new Error('No access token - please sign in again');
    }

    console.log('[PhotosAPI] Validating token, length:', this.accessToken.length);
    console.log('[PhotosAPI] Token preview:', this.accessToken.substring(0, 30) + '...');
    
    // Try tokeninfo endpoint first (gives more details)
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${this.accessToken}`);
      console.log('[PhotosAPI] Tokeninfo response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[PhotosAPI] Token info:', data);
        return {
          email: data.email,
          scope: data.scope,
          expires_in: data.expires_in,
          audience: data.audience  // This is the client ID the token was issued for!
        };
      }
    } catch (err) {
      console.log('[PhotosAPI] Tokeninfo failed, trying userinfo...');
    }

    // Fallback to userinfo endpoint
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    console.log('[PhotosAPI] Userinfo response:', response.status);

    if (response.status === 401) {
      throw new Error('Token expired or invalid - please sign in again');
    }
    
    if (!response.ok) {
      throw new Error(`Token validation failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[PhotosAPI] Token valid for:', data.email);
    return { email: data.email };
  }

  /**
   * List ALL media items from the user's library.
   * Try GET endpoint first, fallback to POST search if needed.
   */
  async listMediaItems(pageSize: number = 50, pageToken?: string): Promise<GPListResponse<GPMediaItem>> {
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) params.set('pageToken', pageToken);

    console.log('[PhotosAPI] Trying GET /mediaItems endpoint');
    
    try {
      // Try the GET endpoint WITHOUT search
      const response = await this.fetchWithAuth(`/mediaItems?${params}`);
      const data = await response.json();
      console.log('[PhotosAPI] GET response:', { count: data.mediaItems?.length || 0 });
      return data;
    } catch (err: any) {
      console.warn('[PhotosAPI] GET failed:', err.message);
      
      // Try POST search with empty body (should return all items)
      console.log('[PhotosAPI] Trying POST /mediaItems:search with empty body...');
      try {
        const response = await this.fetchWithAuth('/mediaItems:search', {
          method: 'POST',
          body: JSON.stringify({ pageSize }),
        });
        const data = await response.json();
        console.log('[PhotosAPI] POST search response:', { count: data.mediaItems?.length || 0 });
        return data;
      } catch (err2: any) {
        console.error('[PhotosAPI] POST search also failed:', err2.message);
        throw err; // Throw the original error
      }
    }
  }

  /**
   * List albums
   */
  async listAlbums(pageSize: number = 50, pageToken?: string): Promise<GPListResponse<GPAlbum>> {
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) params.set('pageToken', pageToken);

    console.log('[PhotosAPI] Trying GET /albums endpoint');
    const response = await this.fetchWithAuth(`/albums?${params}`);
    const data = await response.json();
    console.log('[PhotosAPI] Albums response:', { count: data.albums?.length || 0 });
    return data;
  }

  /**
   * Search media items within a specific album
   */
  async searchMediaItems(albumId?: string, pageToken?: string, pageSize: number = 50): Promise<GPListResponse<GPMediaItem>> {
    const body: Record<string, unknown> = { pageSize };
    if (albumId) body.albumId = albumId;
    if (pageToken) body.pageToken = pageToken;

    console.log('[PhotosAPI] Searching within album:', albumId || 'none');
    const response = await this.fetchWithAuth('/mediaItems:search', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await response.json();
    console.log('[PhotosAPI] Search response:', { count: data.mediaItems?.length || 0 });
    return data;
  }

  getThumbnailUrl(baseUrl: string, width: number = 256, height: number = 256): string {
    return `${baseUrl}=w${width}-h${height}-c`;
  }

  getFullSizeUrl(baseUrl: string): string {
    return `${baseUrl}=d`;
  }

  getVideoThumbnailUrl(baseUrl: string, width: number = 256, height: number = 256): string {
    return `${baseUrl}=w${width}-h${height}-c`;
  }
}

export const photosApi = new PhotosApiClient();
