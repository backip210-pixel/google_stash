// Tag types
export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface TagCategory {
  id: string;
  name: string;
  icon: string;
  tags: Tag[];
}

// Photo types
export interface PhotoAsset {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
  mediaType: 'photo' | 'video' | 'unknown';
  creationTime?: number;
  modificationTime?: number;
  duration?: number;
  // Tags extracted from filename or metadata
  existingTags: string[];
}

// App state
export type AppView = 'gallery' | 'tags' | 'settings';

export interface SelectionState {
  selectedPhotoIds: Set<string>;
  isSelecting: boolean;
}

// Color palette for tags
export const TAG_COLORS = [
  '#1f6feb', '#238636', '#da3633', '#f85149', '#bc8cff',
  '#3fb950', '#58a6ff', '#d29922', '#f778ba', '#79c0ff',
  '#a371f7', '#56d364', '#e3b341', '#ff7b72', '#8b949e',
];

// Default categories
export const DEFAULT_CATEGORIES: Omit<TagCategory, 'tags'>[] = [
  { id: 'people', name: 'People', icon: '👤' },
  { id: 'places', name: 'Places', icon: '📍' },
  { id: 'events', name: 'Events', icon: '🎉' },
  { id: 'objects', name: 'Objects', icon: '' },
  { id: 'themes', name: 'Themes', icon: '🎨' },
  { id: 'custom', name: 'Custom', icon: '🏷️' },
];
