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
    if (!this.accessToken) throw new Error('Not authenticated');

    const response = await fetch(`${PHOTOS_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    return response;
  }

  async listMediaItems(pageSize: number = 50, pageToken?: string): Promise<GPListResponse<GPMediaItem>> {
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) params.set('pageToken', pageToken);

    const response = await this.fetchWithAuth(`/mediaItems?${params}`);
    return response.json();
  }

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

  // Get thumbnail URL with specific dimensions
  getThumbnailUrl(baseUrl: string, width: number = 256, height: number = 256): string {
    return `${baseUrl}=w${width}-h${height}-c`;
  }

  // Get full-size image URL
  getFullSizeUrl(baseUrl: string): string {
    return `${baseUrl}=d`;
  }

  // Get video thumbnail
  getVideoThumbnailUrl(baseUrl: string, width: number = 256, height: number = 256): string {
    return `${baseUrl}=w${width}-h${height}-c`;
  }
}

export const photosApi = new PhotosApiClient();
