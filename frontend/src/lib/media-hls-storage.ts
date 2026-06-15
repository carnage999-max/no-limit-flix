import { promises as fs } from 'fs';
import path from 'path';

import { buildMediaUrl, normalizeMediaPath } from './media';
import { copyFileToMedia, getAbsoluteMediaPath } from './media-storage';

interface UploadResult {
  uploadedFiles: number;
  mediaPathBase: string;
  playbackUrl: string;
}

export async function storeHLSInMedia(
  hlsDir: string,
  videoId: string
): Promise<UploadResult> {
  const mediaPathBase = normalizeMediaPath(`videos/${videoId}`);
  let uploadedCount = 0;

  const files = await fs.readdir(hlsDir);
  const hlsFiles = files.filter((file) => file.endsWith('.m3u8') || file.endsWith('.ts'));

  if (hlsFiles.length === 0) {
    throw new Error('No HLS files found in output directory');
  }

  const batchSize = 5;
  for (let i = 0; i < hlsFiles.length; i += batchSize) {
    const batch = hlsFiles.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (file) => {
        const filePath = path.join(hlsDir, file);
        const relativePath = `${mediaPathBase}/${file}`;
        await copyFileToMedia(filePath, relativePath);
        uploadedCount += 1;
      })
    );
  }

  return {
    uploadedFiles: uploadedCount,
    mediaPathBase,
    playbackUrl: buildMediaUrl(`${mediaPathBase}/master.m3u8`),
  };
}

export async function verifyHLSMediaUpload(mediaPathBase: string): Promise<boolean> {
  try {
    const { absolute } = getAbsoluteMediaPath(`${mediaPathBase}/master.m3u8`);
    await fs.access(absolute);
    return true;
  } catch {
    return false;
  }
}
