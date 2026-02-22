import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Ensure FFmpeg is available
const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

interface ConversionResult {
  outputDir: string;
  manifestPath: string;
  totalSegments: number;
}

/**
 * Convert input video file to HLS format (master.m3u8 + segments)
 */
export async function convertToHLS(
  inputPath: string,
  outputDir: string
): Promise<ConversionResult> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-codec:v libx264',
        '-codec:a aac',
        '-b:v 5000k',
        '-maxrate 10000k',
        '-bufsize 20000k',
        '-hls_time 10',
        '-hls_list_size 0',
        '-f hls',
      ])
      .output(path.join(outputDir, 'master.m3u8'))
      .on('end', async () => {
        try {
          // Count segment files
          const files = await fs.readdir(outputDir);
          const segments = files.filter(f => f.endsWith('.ts')).length;
          
          resolve({
            outputDir,
            manifestPath: path.join(outputDir, 'master.m3u8'),
            totalSegments: segments,
          });
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => {
        reject(new Error(`FFmpeg conversion failed: ${err.message}`));
      })
      .run();
  });
}

/**
 * Create a temporary HLS output directory
 */
export async function createTempHLSDir(): Promise<string> {
  const tempBase = path.join(process.cwd(), 'hls-temp');
  const sessionId = uuidv4();
  const outputDir = path.join(tempBase, sessionId);

  await fs.mkdir(outputDir, { recursive: true });
  return outputDir;
}

/**
 * Clean up temporary HLS directory
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (err) {
    console.warn(`Failed to cleanup temp dir ${dirPath}:`, err);
  }
}

/**
 * List all files in HLS directory (manifest + segments)
 */
export async function listHLSFiles(outputDir: string): Promise<string[]> {
  const files = await fs.readdir(outputDir);
  return files.filter(f => f.endsWith('.m3u8') || f.endsWith('.ts'));
}
