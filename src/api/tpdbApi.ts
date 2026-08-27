/**
 * ThePornDB API Client
 * Docs: https://theporndb.net/docs
 * Base URL: https://api.theporndb.net
 * Auth: Bearer token (API key from theporndb.net)
 */

const TPDB_BASE = 'https://api.theporndb.net';

export interface TPDBScene {
  id: number;
  _id: string;
  title: string;
  type: string;
  slug: string;
  external_id: string;
  description: string;
  rating: number;
  site_id: number;
  date: string;
  url: string;
  image: string;
  back_image: string;
  poster: string;
  duration: number;
  sku: string;
  performers: TPDBPerformerRef[];
  site: TPDBSiteRef | null;
  tags: TPDBTagRef[];
  hashes: TPDBHash[];
  created_at: string;
  updated_at: string;
}

export interface TPDBPerformerRef {
  id: number;
  name: string;
  slug: string;
  image?: string;
  alias?: string;
}

export interface TPDBSiteRef {
  id: number;
  name: string;
  slug: string;
  logo?: string;
}

export interface TPDBTagRef {
  id: number;
  name: string;
  slug: string;
}

export interface TPDBHash {
  algorithm: string;
  hash: string;
}

export interface TPDBPerformer {
  id: number;
  name: string;
  slug: string;
  image: string;
  bio?: string;
  birthdate?: string;
  gender?: string;
  ethnicity?: string;
  hair_color?: string;
  eye_color?: string;
  height?: string;
  weight?: string;
  measurements?: string;
  tattoos?: string;
  piercings?: string;
  alias?: string;
}

export interface TPDBPagination {
  total: number;
  per_page: number;
  current_page: number;
  total_pages: number;
}

export interface TPDBResponse<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

class TPDBApiClient {
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('tpdb_api_key', key);
  }

  getApiKey(): string | null {
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem('tpdb_api_key');
    }
    return this.apiKey;
  }

  clearApiKey() {
    this.apiKey = null;
    localStorage.removeItem('tpdb_api_key');
  }

  private async fetch(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const key = this.getApiKey();
    if (!key) throw new Error('ThePornDB API key not configured');

    const url = new URL(`${TPDB_BASE}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('Invalid ThePornDB API key');
      if (response.status === 429) throw new Error('ThePornDB rate limit reached. Wait a moment.');
      throw new Error(`TPDB API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Search scenes by filename parsing
   * The parse parameter extracts site, date, and title from the filename
   */
  async searchScenesByFilename(filename: string, year?: string): Promise<TPDBResponse<TPDBScene>> {
    const params: Record<string, string> = { parse: filename };
    if (year) params.year = year;
    return this.fetch('/scenes', params);
  }

  /**
   * Search scenes by hash (OSHash or other hash)
   */
  async searchScenesByHash(hash: string): Promise<TPDBResponse<TPDBScene>> {
    return this.fetch('/scenes', { hash });
  }

  /**
   * Search scenes with full parameters
   */
  async searchScenes(params: {
    query?: string;
    hash?: string;
    year?: string;
    performer?: string;
    site?: string;
    tag?: string;
    page?: number;
    per_page?: number;
  }): Promise<TPDBResponse<TPDBScene>> {
    const p: Record<string, string> = {};
    if (params.query) p.q = params.query;
    if (params.hash) p.hash = params.hash;
    if (params.year) p.year = params.year;
    if (params.performer) p.performer = params.performer;
    if (params.site) p.site = params.site;
    if (params.tag) p.tag = params.tag;
    if (params.page) p.page = String(params.page);
    if (params.per_page) p.per_page = String(params.per_page);
    return this.fetch('/scenes', p);
  }

  /**
   * Get a specific scene by ID
   */
  async getScene(sceneId: string): Promise<{ data: TPDBScene }> {
    return this.fetch(`/scenes/${sceneId}`);
  }

  /**
   * Search performers
   */
  async searchPerformers(query: string, page?: number): Promise<TPDBResponse<TPDBPerformer>> {
    const params: Record<string, string> = { q: query };
    if (page) params.page = String(page);
    return this.fetch('/performers', params);
  }

  /**
   * Search sites/studios
   */
  async searchSites(query: string): Promise<TPDBResponse<TPDBSiteRef>> {
    return this.fetch('/sites', { q: query });
  }

  /**
   * Parse a filename to extract potential metadata
   * Format: Site YYYY-MM-DD Title or Site - Title
   */
  parseFilename(filename: string): { site?: string; date?: string; title?: string } {
    // Remove extension
    const name = filename.replace(/\.[^.]+$/, '');

    // Try format: Site YYYY-MM-DD Title
    const dateMatch = name.match(/^(.+?)\s+(\d{4}-\d{2}-\d{2})\s+(.+)$/);
    if (dateMatch) {
      return {
        site: dateMatch[1].trim(),
        date: dateMatch[2],
        title: dateMatch[3].trim(),
      };
    }

    // Try format: Site - Title
    const dashMatch = name.match(/^(.+?)\s*[-–—]\s*(.+)$/);
    if (dashMatch) {
      return {
        site: dashMatch[1].trim(),
        title: dashMatch[2].trim(),
      };
    }

    // Fallback: just use the name as a search query
    return { title: name };
  }
}

export const tpdbApi = new TPDBApiClient();
