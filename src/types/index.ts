// Google Photos API types
export interface GPMediaItem {
  id: string;
  description: string;
  productUrl: string;
  baseUrl: string;
  mimeType: string;
  filename: string;
  mediaMetadata: {
    creationTime: string;
    width: string;
    height: string;
    photo?: {
      cameraMake?: string;
      cameraModel?: string;
      focalLength?: number;
      apertureFNumber?: number;
      isoEquivalent?: number;
      exposureTime?: string;
    };
    video?: {
      cameraMake?: string;
      cameraModel?: string;
      fps?: number;
      status?: string;
    };
  };
}

export interface GPAlbum {
  id: string;
  title: string;
  productUrl: string;
  coverPhotoBaseUrl: string;
  coverPhotoMediaItemId: string;
  isWriteable: boolean;
  mediaItemsCount: string;
}

export interface GPListResponse<T> {
  mediaItems?: T[];
  albums?: T[];
  nextPageToken?: string;
}

// Our app types
export interface Tag {
  id?: number;
  name: string;
  color: string;
  categoryId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagCategory {
  id?: number;
  name: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhotoTag {
  id?: number;
  photoId: string;
  tagId: number;
  createdAt: Date;
}

export interface PhotoMetadata {
  photoId: string;
  notes: string;
  rating: number;
  lastViewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// View state
export type ViewMode = 'grid' | 'list';
export type SortMode = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';
export type AppView = 'gallery' | 'tags' | 'albums' | 'tagger' | 'settings';
