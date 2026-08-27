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

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) {
      console.error('[PhotosAPI] ═══ NO ACCESS TOKEN ═══');
      console.error('[PhotosAPI] This means auth completed but token was not saved');
      throw new Error('Not authenticated - no access token available');
    }

    console.log('[PhotosAPI] Making request:', endpoint);
    console.log('[PhotosAPI] Method:', options.method || 'GET');
    console.log('[PhotosAPI] Token preview:', this.accessToken.substring(0, 20) + '...');
    
    const url = `${PHOTOS_API_BASE}${endpoint}`;
    console.log('[PhotosAPI] Full URL:', url);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log('[PhotosAPI] Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PhotosAPI] ═══ API ERROR RESPONSE ═══');
      console.error('[PhotosAPI] Status:', response.status);
      console.error('[PhotosAPI] Response body:', errorText);
      console.error('[PhotosAPI] ═════════════════════════');
      
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: { message: response.statusText } };
      }
      
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    console.log('[PhotosAPI] Response OK');
    return response;
  }

  /**
   * Validate the token by calling userinfo endpoint
   */
  async validateToken(): Promise<{ email?: string; scope?: string }> {
    if (!this.accessToken) {
      throw new Error('No access token');
    }

    console.log('[PhotosAPI] Validating token...');
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Token validation failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[PhotosAPI] Token valid for:', data.email);
    return data;
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
      const response = await this.fetchWithAuth(`/mediaItems?${params}`);
      const data = await response.json();
      console.log('[PhotosAPI] GET response:', { count: data.mediaItems?.length || 0 });
      return data;
    } catch (err: any) {
      console.warn('[PhotosAPI] GET failed, trying POST search:', err.message);
      
      // Fallback to POST search
      const body: Record<string, unknown> = { pageSize };
      if (pageToken) body.pageToken = pageToken;

      console.log('[PhotosAPI] Trying POST /mediaItems:search endpoint');
      const response = await this.fetchWithAuth('/mediaItems:search', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await response.json();
      console.log('[PhotosAPI] POST response:', { count: data.mediaItems?.length || 0 });
      return data;
    }
  }

  /**
   * Search media items within a specific album
   */
  async searchMediaItems(albumId?: string, pageToken?: string, pageSize: number = 50): Promise<GPListResponse<GPMediaItem>> {
    const body: Record<string, unknown> = { pageSize };
    if (albumId) body.albumId = albumId;
    if (pageToken) body.pageToken = pageToken;

    const response = await this.fetchWithAuth('/mediaItems:search', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return response.json();
  }

  async getMediaItem(mediaItemId: string): Promise<GPMediaItem> {
    const response = await this.fetchWithAuth(`/mediaItems/${mediaItemId}`);
    return response.json();
  }

  async listAlbums(pageSize: number = 50, pageToken?: string): Promise<GPListResponse<GPAlbum>> {
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) params.set('pageToken', pageToken);

    const response = await this.fetchWithAuth(`/albums?${params}`);
    return response.json();
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
