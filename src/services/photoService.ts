import * as MediaLibrary from 'expo-media-library';
import type { PhotoAsset } from '../types';

/**
 * Request permissions to access the photo library
 */
export async function requestPermissions(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Fetch photos from the device library
 */
export async function fetchPhotos(pageSize: number = 50, after?: string): Promise<{
  photos: PhotoAsset[];
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  try {
    const options: MediaLibrary.AssetsOptions = {
      mediaType: 'photo',
      sortBy: ['modificationTime'],
      first: pageSize,
    };

    if (after) {
      options.after = after;
    }

    const assets = await MediaLibrary.getAssetsAsync(options);

    const photos: PhotoAsset[] = assets.assets.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
      filename: extractFilename(asset.filename || asset.uri),
      width: asset.width,
      height: asset.height,
      mediaType: 'photo',
      creationTime: asset.creationTime,
      modificationTime: asset.modificationTime,
      existingTags: extractTagsFromFilename(asset.filename || ''),
    }));

    return {
      photos,
      hasNextPage: assets.hasNextPage,
      endCursor: assets.endCursor,
    };
  } catch (error) {
    console.error('Error fetching photos:', error);
    throw error;
  }
}

/**
 * Extract filename from URI or filename string
 */
function extractFilename(input: string): string {
  // If it's a URI, extract the last part
  if (input.includes('/')) {
    const parts = input.split('/');
    return parts[parts.length - 1];
  }
  return input;
}

/**
 * Extract tags from filename
 * Expected format: YYYY-MM-DD_Tag1_Tag2_..._original.jpg
 * or: Tag1_Tag2_..._original.jpg
 */
export function extractTagsFromFilename(filename: string): string[] {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  
  // Split by underscores
  const parts = nameWithoutExt.split('_');
  
  // Filter out date patterns (YYYY-MM-DD) and empty strings
  const tags = parts.filter((part) => {
    // Skip date patterns
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return false;
    // Skip empty strings
    if (!part.trim()) return false;
    return true;
  });

  return tags.map((tag) => tag.trim());
}

/**
 * Parse filename into components
 */
export function parseFilename(filename: string): {
  date?: string;
  tags: string[];
  originalName: string;
} {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  const extension = filename.match(/\.[^.]+$/)?.[0] || '';
  
  const parts = nameWithoutExt.split('_');
  
  // Check if first part is a date
  let date: string | undefined;
  let startIndex = 0;
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
    date = parts[0];
    startIndex = 1;
  }
  
  // Remaining parts are tags (except the last one which might be the original name)
  const tags = parts.slice(startIndex, -1).filter((p) => p.trim());
  const originalName = parts[parts.length - 1] || '';
  
  return { date, tags, originalName: originalName + extension };
}

/**
 * Build a new filename from components
 */
export function buildFilename(
  tags: string[],
  originalName: string,
  date?: string
): string {
  const nameWithoutExt = originalName.replace(/\.[^.]+$/, '');
  const extension = originalName.match(/\.[^.]+$/)?.[0] || '';
  
  const parts: string[] = [];
  
  if (date) {
    parts.push(date);
  }
  
  parts.push(...tags);
  parts.push(nameWithoutExt);
  
  return parts.join('_') + extension;
}

/**
 * Get photo thumbnail URI
 */
export function getThumbnailUri(uri: string, size: number = 200): string {
  // For now, return the original URI
  // In production, we'd generate thumbnails
  return uri;
}
