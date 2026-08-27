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
      console.error('[PhotosAPI] No access token! Auth state:', this.accessToken);
      throw new Error('Not authenticated - no access token');
    }

    console.log('[PhotosAPI] Fetching:', `${PHOTOS_API_BASE}${endpoint}`, 'Token length:', this.accessToken.length);
    const response = await fetch(`${PHOTOS_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log('[PhotosAPI] Response status:', response.status);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      console.error('[PhotosAPI] API Error:', error);
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    return response;
  }

  /**
   * List ALL media items from the user's library using search endpoint.
   * The GET /mediaItems endpoint only returns app-created items,
   * but POST /mediaItems:search returns the full library.
   */
  async listMediaItems(pageSize: number = 50, pageToken?: string): Promise<GPListResponse<GPMediaItem>> {
    const body: Record<string, unknown> = { pageSize };
    if (pageToken) body.pageToken = pageToken;

    console.log('[PhotosAPI] Calling mediaItems:search with body:', body);
    const response = await this.fetchWithAuth('/mediaItems:search', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await response.json();
    console.log('[PhotosAPI] Response:', { count: data.mediaItems?.length || 0, nextPageToken: !!data.nextPageToken });
    return data;
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
