/**
 * Photo storage service for Supabase Storage operations
 * Handles upload/download of photo files to/from cloud storage
 *
 * @module services/photos/photo-storage-service
 */

import { getSupabaseClient } from '@/services/auth/supabase-client';
import { config } from '@/config';
import { readPhotoAsBase64 } from './photo-cache-service';
import { EncodingType } from 'expo-file-system/legacy';

/**
 * Result of a photo upload operation
 */
export interface UploadResult {
  success: boolean;
  remoteUrl: string | null;
  storagePath: string | null;
  error?: string;
}

/**
 * Result of a photo download operation
 */
export interface DownloadResult {
  success: boolean;
  localUri: string | null;
  error?: string;
}

/**
 * Generate storage path for a photo
 * Format: photos/{workOrderServerId}/{photoId}.jpg
 *
 * @param workOrderServerId - Server ID of the work order
 * @param photoId - Local ID of the photo
 * @returns Storage path in bucket
 */
export function generateStoragePath(workOrderServerId: string, photoId: string): string {
  return `photos/${workOrderServerId}/${photoId}.jpg`;
}

/**
 * Get public URL for a storage path
 *
 * @param storagePath - Path in the storage bucket
 * @returns Public URL for the file
 */
export function getPublicUrl(storagePath: string): string {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(config.storageBucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Convert base64 to Uint8Array for upload
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Upload a photo file to Supabase Storage
 *
 * @param photoId - Photo ID (for reading from cache)
 * @param storagePath - Target path in Storage bucket
 * @returns Upload result with remote URL on success
 */
export async function uploadPhotoFile(photoId: string, storagePath: string): Promise<UploadResult> {
  try {
    const supabase = getSupabaseClient();

    // Read file as base64 from local cache
    const base64 = await readPhotoAsBase64(photoId);

    if (!base64) {
      return {
        success: false,
        remoteUrl: null,
        storagePath: null,
        error: 'Photo file not found in local cache',
      };
    }

    // Convert to ArrayBuffer for upload
    const arrayBuffer = base64ToArrayBuffer(base64);

    console.log(`[PhotoStorage] Uploading photo ${photoId} to ${storagePath}`);

    const { data, error } = await supabase.storage
      .from(config.storageBucket)
      .upload(storagePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      // Check if file already exists (duplicate upload)
      if (error.message?.includes('already exists')) {
        console.log(`[PhotoStorage] Photo ${photoId} already exists, getting URL`);
        const publicUrl = getPublicUrl(storagePath);
        return {
          success: true,
          remoteUrl: publicUrl,
          storagePath,
        };
      }

      console.error('[PhotoStorage] Upload error:', error);
      return {
        success: false,
        remoteUrl: null,
        storagePath: null,
        error: error.message,
      };
    }

    // Get public URL
    const publicUrl = getPublicUrl(storagePath);

    console.log(`[PhotoStorage] Upload successful: ${publicUrl}`);

    return {
      success: true,
      remoteUrl: publicUrl,
      storagePath: data.path,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PhotoStorage] Upload failed:', message);
    return {
      success: false,
      remoteUrl: null,
      storagePath: null,
      error: message,
    };
  }
}

/**
 * Upload a photo directly from a local URI (for photos not yet in cache)
 *
 * @param localUri - Local file URI
 * @param storagePath - Target path in Storage bucket
 * @returns Upload result with remote URL on success
 */
export async function uploadPhotoFromUri(
  localUri: string,
  storagePath: string
): Promise<UploadResult> {
  try {
    const supabase = getSupabaseClient();

    // Import FileSystem dynamically to avoid circular dependencies
    const FileSystem = await import('expo-file-system');

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: EncodingType.Base64,
    });

    // Convert to ArrayBuffer for upload
    const arrayBuffer = base64ToArrayBuffer(base64);

    console.log(`[PhotoStorage] Uploading from URI to ${storagePath}`);

    const { data, error } = await supabase.storage
      .from(config.storageBucket)
      .upload(storagePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      if (error.message?.includes('already exists')) {
        const publicUrl = getPublicUrl(storagePath);
        return {
          success: true,
          remoteUrl: publicUrl,
          storagePath,
        };
      }

      console.error('[PhotoStorage] Upload error:', error);
      return {
        success: false,
        remoteUrl: null,
        storagePath: null,
        error: error.message,
      };
    }

    const publicUrl = getPublicUrl(storagePath);

    return {
      success: true,
      remoteUrl: publicUrl,
      storagePath: data.path,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PhotoStorage] Upload failed:', message);
    return {
      success: false,
      remoteUrl: null,
      storagePath: null,
      error: message,
    };
  }
}

/**
 * Delete a photo from Supabase Storage
 *
 * @param storagePath - Path of the file in storage bucket
 * @returns True if deleted successfully
 */
export async function deletePhotoFile(storagePath: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase.storage.from(config.storageBucket).remove([storagePath]);

    if (error) {
      console.error('[PhotoStorage] Delete error:', error);
      return false;
    }

    console.log(`[PhotoStorage] Deleted photo: ${storagePath}`);
    return true;
  } catch (error) {
    console.error('[PhotoStorage] Delete failed:', error);
    return false;
  }
}

/**
 * Check if a photo exists in Supabase Storage
 *
 * @param storagePath - Path of the file in storage bucket
 * @returns True if file exists
 */
export async function photoExistsInStorage(storagePath: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();

    // Get the directory and filename from the path
    const pathParts = storagePath.split('/');
    const fileName = pathParts.pop();
    const directory = pathParts.join('/');

    const { data, error } = await supabase.storage.from(config.storageBucket).list(directory, {
      ...(fileName && { search: fileName }),
    });

    if (error) {
      console.error('[PhotoStorage] Existence check error:', error);
      return false;
    }

    return data?.some(file => file.name === fileName) ?? false;
  } catch (error) {
    console.error('[PhotoStorage] Existence check failed:', error);
    return false;
  }
}

/**
 * Get a signed URL for temporary access to a photo
 * Useful for private buckets
 *
 * @param storagePath - Path of the file in storage bucket
 * @param expiresIn - Expiration time in seconds (default 1 hour)
 * @returns Signed URL or null on error
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.storage
      .from(config.storageBucket)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      console.error('[PhotoStorage] Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('[PhotoStorage] Signed URL failed:', error);
    return null;
  }
}
