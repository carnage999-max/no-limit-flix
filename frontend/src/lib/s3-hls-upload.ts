import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import path from 'path';
import { createReadStream } from 'fs';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  requestHandler: {
    connectionTimeout: 600000,  // 10 minutes
    socketTimeout: 600000,      // 10 minutes (prevent idle timeout)
  }
});
const BUCKET = process.env.AWS_BUCKET_NAME || 'no-limit-flix';

interface UploadResult {
  uploadedFiles: number;
  s3KeyBase: string;
}

/**
 * Upload entire HLS folder to S3
 * Folder structure: s3://bucket/videos/{videoId}/master.m3u8, segments, etc.
 */
export async function uploadHLSToS3(
  hlsDir: string,
  videoId: string
): Promise<UploadResult> {
  const s3KeyBase = `videos/${videoId}`;
  let uploadedCount = 0;

  try {
    // List all files in HLS directory
    const files = await fs.readdir(hlsDir);
    const hlsFiles = files.filter(f => f.endsWith('.m3u8') || f.endsWith('.ts'));

    if (hlsFiles.length === 0) {
      throw new Error('No HLS files found in output directory');
    }

    console.log(`📤 [S3] Uploading ${hlsFiles.length} HLS files in parallel batches...`);

    // Upload in parallel batches of 5 to avoid timeout while keeping reasonable concurrency
    const batchSize = 5;
    for (let i = 0; i < hlsFiles.length; i += batchSize) {
      const batch = hlsFiles.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (file) => {
          const filePath = path.join(hlsDir, file);
          const s3Key = `${s3KeyBase}/${file}`;
          const fileStream = createReadStream(filePath);

          // Determine MIME type
          const mimeType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t';

          const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: s3Key,
            Body: fileStream,
            ContentType: mimeType,
          });

          await s3Client.send(command);
          uploadedCount++;
          console.log(`✓ [${uploadedCount}/${hlsFiles.length}] Uploaded ${file}`);
        })
      );
    }

    console.log(`✅ [S3] Uploaded all ${uploadedCount} HLS files successfully`);
    return {
      uploadedFiles: uploadedCount,
      s3KeyBase,
    };
  } catch (error) {
    throw new Error(`Failed to upload HLS to S3: ${(error as Error).message}`);
  }
}

/**
 * Verify HLS manifest was uploaded to S3
 */
export async function verifyHLSUpload(s3KeyBase: string): Promise<boolean> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: s3KeyBase,
    });

    const response = await s3Client.send(command);
    const hasManifest = (response.Contents || []).some(obj =>
      obj.Key?.endsWith('master.m3u8')
    );

    return hasManifest;
  } catch (error) {
    console.error('Failed to verify HLS upload:', error);
    return false;
  }
}
