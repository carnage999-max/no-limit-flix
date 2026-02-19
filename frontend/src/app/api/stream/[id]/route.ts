import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: assetId } = await context.params;

    try {
        const video = await (prisma.video as any).findUnique({
            where: { id: assetId }
        });

        if (!video) {
            return new Response('Video not found', { status: 404 });
        }

        const inputUrl = video.s3Url;

        // Headers for streaming
        const headers = new Headers();
        headers.set('Content-Type', 'video/mp4');
        headers.set('Accept-Ranges', 'none');
        headers.set('Cache-Control', 'no-cache');
        headers.set('Connection', 'keep-alive');

        // FFmpeg command for robust mobile streaming
        // We use libx264 for maximum compatibility across all iOS/Android devices.
        // fragmented mp4 allows streaming the output without having the whole file.
        const ffmpegParams = [
            '-i', inputUrl,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'zerolatency',
            '-crf', '28',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ar', '44100',
            '-f', 'mp4',
            '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
            'pipe:1'
        ];

        const ffmpeg = spawn('ffmpeg', ffmpegParams);

        // Create a ReadableStream from ffmpeg stdout
        const stream = new ReadableStream({
            start(controller) {
                ffmpeg.stdout.on('data', (chunk) => {
                    controller.enqueue(new Uint8Array(chunk));
                });
                ffmpeg.stdout.on('end', () => {
                    controller.close();
                });
                ffmpeg.on('error', (err) => {
                    console.error('FFmpeg process error:', err);
                    controller.error(err);
                });
                ffmpeg.stderr.on('data', (data) => {
                    // console.log(`ffmpeg debug: ${data}`);
                });
            },
            cancel() {
                ffmpeg.kill();
            }
        });

        return new Response(stream, { headers });

    } catch (error) {
        console.error('Streaming API error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
