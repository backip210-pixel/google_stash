import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';

export interface FileHash {
  sha256: string;
  size: number;
  filename: string;
}

/**
 * Generate SHA256 hash of a file
 * Used for ThePornDB matching
 */
export async function generateFileHash(fileUri: string): Promise<FileHash> {
  try {
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    
    if (!fileInfo.exists || !('size' in fileInfo)) {
      throw new Error('File does not exist or has no size');
    }

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to Uint8Array
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate SHA256 hash
    const hashBuffer = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      base64,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );

    // Extract filename from URI
    const filename = fileUri.split('/').pop() || 'unknown';

    return {
      sha256: hashBuffer,
      size: fileInfo.size || 0,
      filename,
    };
  } catch (error) {
    console.error('Error generating file hash:', error);
    throw error;
  }
}

/**
 * Generate OSHash-like hash for video files
 * OSHash is used by ThePornDB for video matching
 * It's based on file size and first/last 128KB of file
 */
export async function generateOSHash(fileUri: string): Promise<string> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    
    if (!fileInfo.exists || !('size' in fileInfo) || !fileInfo.size) {
      throw new Error('File does not exist or has no size');
    }

    const fileSize = fileInfo.size;
    const CHUNK_SIZE = 65536; // 64KB

    // Read first chunk
    const firstChunk = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: Math.min(CHUNK_SIZE, fileSize),
    });

    // Read last chunk
    const lastPosition = Math.max(0, fileSize - CHUNK_SIZE);
    const lastChunk = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: lastPosition,
      length: Math.min(CHUNK_SIZE, fileSize - lastPosition),
    });

    // Combine file size + first chunk + last chunk
    const combined = `${fileSize}:${firstChunk}:${lastChunk}`;

    // Generate hash
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    return hash;
  } catch (error) {
    console.error('Error generating OSHash:', error);
    throw error;
  }
}

/**
 * Generate both SHA256 and OSHash for a file
 */
export async function generateAllHashes(fileUri: string): Promise<{
  sha256: string;
  osHash?: string;
  size: number;
  filename: string;
}> {
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  const filename = fileUri.split('/').pop() || 'unknown';
  const sha256Hash = await generateFileHash(fileUri);
  
  const result: {
    sha256: string;
    osHash?: string;
    size: number;
    filename: string;
  } = {
    sha256: sha256Hash.sha256,
    size: 'size' in fileInfo ? (fileInfo.size || 0) : 0,
    filename,
  };

  // Generate OSHash only for video files
  if (filename.match(/\.(mp4|avi|mkv|mov|wmv|flv|webm)$/i)) {
    try {
      result.osHash = await generateOSHash(fileUri);
    } catch (error) {
      console.warn('Failed to generate OSHash for video:', error);
    }
  }

  return result;
}

/**
 * Export hashes to JSON file for ThePornDB
 */
export async function exportHashesToJson(
  hashes: Array<{
    sha256: string;
    osHash?: string;
    size: number;
    filename: string;
  }>,
  outputUri: string
): Promise<void> {
  const jsonContent = JSON.stringify(hashes, null, 2);
  
  await FileSystem.writeAsStringAsync(outputUri, jsonContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

/**
 * Import hashes from JSON file
 */
export async function importHashesFromJson(
  fileUri: string
): Promise<Array<{
  sha256: string;
  osHash?: string;
  size: number;
  filename: string;
}>> {
  const jsonContent = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return JSON.parse(jsonContent);
}
