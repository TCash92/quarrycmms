/**
 * Photo cache service for local file management
 * Handles saving, loading, and cleaning up local photo files
 *
 * @module services/photos/photo-cache-service
 */

import * as FileSystem from 'expo-file-system';
import { documentDirectory, EncodingType } from 'expo-file-system/legacy';

/** Base directory for cached photos */
export const PHOTOS_DIRECTORY = `${documentDirectory}photos/`;

/** Retention period for uploaded photos (30 days in ms) */
export const PHOTO_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Ensure photos directory exists
 */
export async function ensurePhotosDirectory(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIRECTORY, { intermediates: true });
    console.log('[PhotoCache] Created photos directory');
  }
}

/**
 * Get local file path for a photo
 * @param photoId - Unique photo identifier
 * @returns Full local file path
 */
export function getPhotoPath(photoId: string): string {
  return `${PHOTOS_DIRECTORY}${photoId}.jpg`;
}

/**
 * Save a photo to local cache
 * @param sourceUri - Source URI (camera roll, temp file)
 * @param photoId - Unique photo identifier
 * @returns Local file URI
 */
export async function savePhotoToCache(sourceUri: string, photoId: string): Promise<string> {
  await ensurePhotosDirectory();

  const destPath = getPhotoPath(photoId);

  // Copy from source to cache directory
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destPath,
  });

  console.log(`[PhotoCache] Saved photo ${photoId} to cache`);
  return destPath;
}

/**
 * Check if photo exists in local cache
 * @param photoId - Unique photo identifier
 * @returns True if file exists
 */
export async function photoExistsInCache(photoId: string): Promise<boolean> {
  const path = getPhotoPath(photoId);
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}

/**
 * Delete photo from local cache
 * @param photoId - Unique photo identifier
 * @returns True if deleted successfully
 */
export async function deletePhotoFromCache(photoId: string): Promise<boolean> {
  try {
    const path = getPhotoPath(photoId);
    const info = await FileSystem.getInfoAsync(path);

    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
      console.log(`[PhotoCache] Deleted photo ${photoId} from cache`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[PhotoCache] Failed to delete photo ${photoId}:`, error);
    return false;
  }
}

/**
 * Get file info (size, modification time)
 * @param photoId - Unique photo identifier
 * @returns File info or null if not found
 */
export async function getPhotoInfo(photoId: string): Promise<FileSystem.FileInfo | null> {
  try {
    const path = getPhotoPath(photoId);
    const info = await FileSystem.getInfoAsync(path);
    return info.exists ? info : null;
  } catch (error) {
    console.error(`[PhotoCache] Failed to get info for photo ${photoId}:`, error);
    return null;
  }
}

/**
 * Read photo as base64 string
 * @param photoId - Unique photo identifier
 * @returns Base64 encoded photo data or null if not found
 */
export async function readPhotoAsBase64(photoId: string): Promise<string | null> {
  try {
    const path = getPhotoPath(photoId);
    const info = await FileSystem.getInfoAsync(path);

    if (!info.exists) {
      return null;
    }

    const base64 = await FileSystem.readAsStringAsync(path, {
      encoding: EncodingType.Base64,
    });

    return base64;
  } catch (error) {
    console.error(`[PhotoCache] Failed to read photo ${photoId}:`, error);
    return null;
  }
}

/**
 * Get total cache size in bytes
 * @returns Total size of all cached photos
 */
export async function getCacheSize(): Promise<number> {
  try {
    await ensurePhotosDirectory();

    const files = await FileSystem.readDirectoryAsync(PHOTOS_DIRECTORY);
    let totalSize = 0;

    for (const file of files) {
      const path = `${PHOTOS_DIRECTORY}${file}`;
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists && info.size) {
        totalSize += info.size;
      }
    }

    return totalSize;
  } catch (error) {
    console.error('[PhotoCache] Failed to get cache size:', error);
    return 0;
  }
}

/**
 * Get list of all cached photo IDs
 * @returns Array of photo IDs in cache
 */
export async function listCachedPhotos(): Promise<string[]> {
  try {
    await ensurePhotosDirectory();

    const files = await FileSystem.readDirectoryAsync(PHOTOS_DIRECTORY);

    // Extract photo IDs from filenames (remove .jpg extension)
    return files.filter(f => f.endsWith('.jpg')).map(f => f.replace('.jpg', ''));
  } catch (error) {
    console.error('[PhotoCache] Failed to list cached photos:', error);
    return [];
  }
}

/**
 * Clear entire photo cache (use with caution)
 */
export async function clearPhotoCache(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(PHOTOS_DIRECTORY);
    if (info.exists) {
      await FileSystem.deleteAsync(PHOTOS_DIRECTORY, { idempotent: true });
      console.log('[PhotoCache] Cleared photo cache');
    }
    // Recreate empty directory
    await ensurePhotosDirectory();
  } catch (error) {
    console.error('[PhotoCache] Failed to clear cache:', error);
    throw error;
  }
}

/**
 * Download a file from a URL to local cache
 * @param url - Remote URL to download from
 * @param photoId - Photo ID to save as
 * @returns Local file URI or null on failure
 */
export async function downloadToCache(url: string, photoId: string): Promise<string | null> {
  try {
    await ensurePhotosDirectory();

    const destPath = getPhotoPath(photoId);

    const downloadResult = await FileSystem.downloadAsync(url, destPath);

    if (downloadResult.status === 200) {
      console.log(`[PhotoCache] Downloaded photo ${photoId} to cache`);
      return destPath;
    } else {
      console.error(`[PhotoCache] Download failed with status ${downloadResult.status}`);
      return null;
    }
  } catch (error) {
    console.error(`[PhotoCache] Failed to download photo ${photoId}:`, error);
    return null;
  }
}
