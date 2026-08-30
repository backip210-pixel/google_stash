import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { buildFilename, extractTagsFromFilename } from './photoService';

export interface RenameResult {
  success: boolean;
  originalName: string;
  newName: string;
  error?: string;
}

export interface BatchRenameResult {
  total: number;
  successful: number;
  failed: number;
  results: RenameResult[];
}

/**
 * Copy a photo to app storage for processing
 */
export async function copyPhotoToAppStorage(
  photoUri: string,
  newFilename: string
): Promise<string> {
  const appDir = `${FileSystem.documentDirectory}processed/`;
  
  // Ensure directory exists
  const dirInfo = await FileSystem.getInfoAsync(appDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(appDir, { intermediates: true });
  }
  
  const newPath = `${appDir}${newFilename}`;
  
  // Copy the file
  await FileSystem.copyAsync({
    from: photoUri,
    to: newPath,
  });
  
  return newPath;
}

/**
 * Rename a photo file with new tags
 */
export async function renamePhoto(
  photoUri: string,
  newTags: string[],
  date?: string
): Promise<RenameResult> {
  try {
    // Extract current filename
    const currentFilename = photoUri.split('/').pop() || 'unknown.jpg';
    const nameWithoutExt = currentFilename.replace(/\.[^.]+$/, '');
    const extension = currentFilename.match(/\.[^.]+$/)?.[0] || '.jpg';
    
    // Build new filename
    const parts: string[] = [];
    
    if (date) {
      parts.push(date);
    }
    
    parts.push(...newTags);
    parts.push(nameWithoutExt);
    
    const newFilename = parts.join('_') + extension;
    
    // Copy to app storage with new name
    const newPath = await copyPhotoToAppStorage(photoUri, newFilename);
    
    return {
      success: true,
      originalName: currentFilename,
      newName: newFilename,
    };
  } catch (error: any) {
    return {
      success: false,
      originalName: photoUri.split('/').pop() || 'unknown',
      newName: '',
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Batch rename multiple photos
 */
export async function batchRenamePhotos(
  photos: Array<{ uri: string; filename: string }>,
  tagsToAdd: string[],
  tagsToRemove?: string[],
  date?: string
): Promise<BatchRenameResult> {
  const results: RenameResult[] = [];
  let successful = 0;
  let failed = 0;
  
  for (const photo of photos) {
    // Extract existing tags from filename
    const existingTags = extractTagsFromFilename(photo.filename);
    
    // Add new tags
    const updatedTags = [...new Set([...existingTags, ...tagsToAdd])];
    
    // Remove specified tags
    const finalTags = tagsToRemove
      ? updatedTags.filter((tag) => !tagsToRemove.includes(tag))
      : updatedTags;
    
    const result = await renamePhoto(photo.uri, finalTags, date);
    results.push(result);
    
    if (result.success) {
      successful++;
    } else {
      failed++;
    }
  }
  
  return {
    total: photos.length,
    successful,
    failed,
    results,
  };
}

/**
 * Get app storage directory info
 */
export async function getAppStorageInfo(): Promise<{
  exists: boolean;
  uri: string;
  fileCount?: number;
}> {
  const appDir = `${FileSystem.documentDirectory}processed/`;
  const dirInfo = await FileSystem.getInfoAsync(appDir);
  
  let fileCount = 0;
  if (dirInfo.exists) {
    const files = await FileSystem.readDirectoryAsync(appDir);
    fileCount = files.length;
  }
  
  return {
    exists: dirInfo.exists,
    uri: appDir,
    fileCount,
  };
}

/**
 * Clear app storage
 */
export async function clearAppStorage(): Promise<void> {
  const appDir = `${FileSystem.documentDirectory}processed/`;
  const dirInfo = await FileSystem.getInfoAsync(appDir);
  
  if (dirInfo.exists) {
    await FileSystem.deleteAsync(appDir, { idempotent: true });
  }
}

/**
 * List processed files
 */
export async function listProcessedFiles(): Promise<string[]> {
  const appDir = `${FileSystem.documentDirectory}processed/`;
  const dirInfo = await FileSystem.getInfoAsync(appDir);
  
  if (!dirInfo.exists) {
    return [];
  }
  
  return await FileSystem.readDirectoryAsync(appDir);
}
