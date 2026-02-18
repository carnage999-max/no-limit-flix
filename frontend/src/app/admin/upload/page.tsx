'use client';

import { useState, useRef } from 'react';
import { Upload, FileVideo, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { ButtonPrimary } from '@/components';
import Link from 'next/link';

export default function AdminUploadPage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assetType, setAssetType] = useState<'movie' | 'series'>('movie');
    const [seasonNumber, setSeasonNumber] = useState('');
    const [episodeNumber, setEpisodeNumber] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [thumbProgress, setThumbProgress] = useState(0);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const thumbInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const videoFile = e.target.files[0];
            setFile(videoFile);
            setStatus('idle');

            if (!title) {
                const nameWithoutExt = videoFile.name.replace(/\.[^/.]+$/, "");
                setTitle(nameWithoutExt);
            }

            // Automatic Thumbnail Extraction
            extractThumbnail(videoFile);
        }
    };

    const extractThumbnail = (videoFile: File) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(videoFile);

        video.onloadedmetadata = () => {
            // Seek to 1 second to avoid potential black frame at start
            video.currentTime = 1;
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const thumbFile = new File([blob], 'auto-thumb.jpg', { type: 'image/jpeg' });
                        setThumbnailFile(thumbFile);
                        setThumbnailPreview(URL.createObjectURL(blob));
                    }
                }, 'image/jpeg', 0.8);
            }
            URL.revokeObjectURL(video.src);
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title) return;

        setUploading(true);
        setProgress(0);
        setStatus('uploading');
        setError('');

        try {
            const res = await fetch('/api/admin/upload/presigned-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    fileType: file.type,
                    thumbFileName: thumbnailFile?.name,
                    thumbFileType: thumbnailFile?.type,
                    title,
                    description,
                    type: assetType,
                    seasonNumber: assetType === 'series' ? seasonNumber : null,
                    episodeNumber: assetType === 'series' ? episodeNumber : null
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to get upload URL');
            }

            const { presignedUrl, thumbPresignedUrl, videoId } = await res.json();

            // 1. Upload Video
            const videoXhr = new XMLHttpRequest();
            const videoUploadPromise = new Promise((resolve, reject) => {
                videoXhr.open('PUT', presignedUrl);
                videoXhr.setRequestHeader('Content-Type', file.type);
                videoXhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        setProgress(Math.round((event.loaded / event.total) * 100));
                    }
                };
                videoXhr.onload = () => {
                    if (videoXhr.status === 200) resolve(true);
                    else reject(new Error(`Video upload failed (${videoXhr.status})`));
                };
                videoXhr.onerror = () => reject(new Error('Network error during video upload'));
                videoXhr.send(file);
            });

            // 2. Upload Thumbnail (Parallel)
            let thumbUploadPromise = Promise.resolve(true);
            if (thumbPresignedUrl && thumbnailFile) {
                const thumbXhr = new XMLHttpRequest();
                thumbUploadPromise = new Promise((resolve, reject) => {
                    thumbXhr.open('PUT', thumbPresignedUrl);
                    thumbXhr.setRequestHeader('Content-Type', thumbnailFile.type);
                    thumbXhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            setThumbProgress(Math.round((event.loaded / event.total) * 100));
                        }
                    };
                    thumbXhr.onload = () => {
                        if (thumbXhr.status === 200) resolve(true);
                        else reject(new Error(`Thumbnail upload failed (${thumbXhr.status})`));
                    };
                    thumbXhr.onerror = () => reject(new Error('Network error during thumbnail upload'));
                    thumbXhr.send(thumbnailFile);
                });
            }

            await Promise.all([videoUploadPromise, thumbUploadPromise]);

            const completeRes = await fetch('/api/admin/upload/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId, fileSize: file.size }),
            });

            if (!completeRes.ok) throw new Error('Database sync failed');

            setStatus('success');
            setFile(null);
            setThumbnailFile(null);
            setThumbnailPreview(null);
            setTitle('');
            setDescription('');
            setSeasonNumber('');
            setEpisodeNumber('');
            setProgress(0);
            setThumbProgress(0);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
            setStatus('error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-12 px-6 space-y-20 animate-fade-in mb-24">
            {/* Elegant Header */}
            <div className="flex flex-col items-center text-center space-y-6">
                <Link
                    href="/admin"
                    className="group flex items-center gap-2 text-[10px] uppercase tracking-[0.5em] font-black text-white/20 hover:text-gold-mid transition-all"
                >
                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                    Return to Mission Control
                </Link>
                <div className="space-y-4">
                    <h1 className="text-display gold-gradient-text uppercase leading-none tracking-tighter">
                        Library Ingestion
                    </h1>
                    <p className="text-subheading text-white/30 font-medium max-w-xl mx-auto italic">
                        Securing cinematic assets into the vault. Automatic metadata extraction enabled.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-16">
                {/* Left Column: Upload & Preview */}
                <div className="lg:col-span-12 space-y-12">
                    <div
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        className={`
                            relative w-full min-h-[400px] flex flex-col items-center justify-center rounded-[3rem] transition-all duration-1000 overflow-hidden group border-2 border-dashed
                            ${file
                                ? 'bg-black/40 border-gold-mid/40 shadow-[0_0_100px_rgba(212,175,55,0.1)]'
                                : 'bg-white/[0.02] border-white/5 hover:border-gold-mid/30 hover:bg-white/[0.05] backdrop-blur-3xl'}
                            ${uploading ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
                        `}
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" className="hidden" />

                        {file ? (
                            <div className="relative w-full h-full flex flex-col md:flex-row items-center gap-12 p-12 animate-scale-in">
                                {/* Auto-extracted Preview Card */}
                                <div className="relative w-full md:w-[480px] aspect-video rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 group/thumb">
                                    {thumbnailPreview ? (
                                        <img src={thumbnailPreview} alt="Auto-extracted" className="w-full h-full object-cover transition-transform duration-1000 group-hover/thumb:scale-110" />
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center animate-pulse gap-4">
                                            <Loader2 className="w-8 h-8 text-gold-mid animate-spin opacity-50" />
                                            <span className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-black">Extracting Visuals...</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-gold-mid animate-pulse" />
                                            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white/60 text-shadow">Automatic Frame Capture</span>
                                        </div>
                                    </div>
                                </div>

                                {/* File Details */}
                                <div className="flex-1 space-y-6 text-center md:text-left">
                                    <div className="space-y-2">
                                        <p className="text-[10px] uppercase tracking-[0.5em] font-black text-gold-mid">Asset Selected</p>
                                        <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tighter break-all line-clamp-2 uppercase italic">{file.name}</h3>
                                    </div>
                                    <div className="flex flex-col md:flex-row items-center gap-6 justify-center md:justify-start">
                                        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                                            <FileVideo className="w-4 h-4 text-gold-mid" />
                                            <span className="text-[11px] font-black text-white/50 lowercase tracking-widest italic line-clamp-1 max-w-[150px]">{file.type}</span>
                                        </div>
                                        <span className="text-[11px] font-black text-gold-mid/60 uppercase tracking-widest italic line-clamp-1">{(file.size / (1024 * 1024)).toFixed(0)} Megabytes</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setFile(null); setThumbnailPreview(null); setThumbnailFile(null); }}
                                        className="text-[10px] text-white/20 hover:text-gold-mid transition-all uppercase tracking-[0.6em] font-black underline underline-offset-8"
                                    >
                                        Eject Selection
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-10 group/drop">
                                <div className="w-24 h-24 rounded-[2.5rem] border border-white/5 flex items-center justify-center group-hover/drop:border-gold-mid/40 group-hover/drop:scale-110 transition-all duration-700 bg-white/[0.01] relative">
                                    <Upload className="w-8 h-8 text-white/10 group-hover/drop:text-gold-mid group-hover/drop:animate-bounce" />
                                    <div className="absolute inset-0 bg-gold-mid/5 blur-3xl opacity-0 group-hover/drop:opacity-100 transition-opacity rounded-full scale-150" />
                                </div>
                                <div className="text-center space-y-4">
                                    <p className="text-2xl sm:text-3xl font-black text-white/20 group-hover/drop:text-white transition-colors tracking-tighter uppercase italic">Inject Cinematic Feed</p>
                                    <p className="text-[10px] text-white/10 uppercase tracking-[0.5em] font-black">Validated Formats: MP4, MOV, WEBM</p>
                                </div>
                            </div>
                        )}

                        {uploading && (
                            <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center p-8 z-50 animate-fade-in">
                                <div className="w-full max-w-2xl space-y-12">
                                    <div className="flex flex-col items-center gap-8">
                                        <div className="relative">
                                            <Loader2 className="w-20 h-20 animate-spin text-gold-mid opacity-20" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Upload className="w-8 h-8 text-gold-mid animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="text-center space-y-3">
                                            <h2 className="text-4xl font-black gold-gradient-text uppercase tracking-tighter italic">Broadcasting to Orbit</h2>
                                            <p className="text-[11px] uppercase tracking-[0.5em] text-white/40 font-black animate-pulse">Syncing Video + Captured Frames</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden p-1 border border-white/5">
                                            <div className="gold-gradient h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_20px_rgba(212,175,55,0.5)]" style={{ width: `${progress}%` }} />
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase tracking-[0.4em] font-black text-gold-mid block italic">Transmission Power</span>
                                                <span className="text-4xl font-black text-white leading-none">{progress}%</span>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <span className="text-[10px] uppercase tracking-[0.4em] font-black text-white/20 block italic">Status</span>
                                                <span className="text-[11px] uppercase tracking-[0.2em] font-black text-gold-mid animate-pulse italic">Injecting...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Classification Section - Redesigned to be Premium */}
                <div className="lg:col-span-12 space-y-12 animate-fade-in py-12 border-y border-white/5">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24">
                        <div className="space-y-8 text-center md:text-left flex-1 max-w-sm">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Content DNA</h3>
                            <p className="text-[11px] text-white/40 font-medium tracking-wide leading-relaxed">
                                Select the core classification for this asset. Series will unlock additional episodic metadata fields for precise vault organization.
                            </p>
                        </div>

                        <div className="flex p-3 bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] border border-white/5 shadow-inner scale-110">
                            <button
                                type="button"
                                onClick={() => setAssetType('movie')}
                                className={`
                                    px-10 py-5 rounded-[2rem] text-[11px] uppercase tracking-[0.4em] font-black transition-all duration-700
                                    ${assetType === 'movie'
                                        ? 'bg-gold-mid text-background shadow-[0_15px_40px_rgba(212,175,55,0.3)] scale-105'
                                        : 'text-white/20 hover:text-white/60 hover:bg-white/5'}
                                `}
                            >
                                Feature Film
                            </button>
                            <button
                                type="button"
                                onClick={() => setAssetType('series')}
                                className={`
                                    px-10 py-5 rounded-[2rem] text-[11px] uppercase tracking-[0.4em] font-black transition-all duration-700
                                    ${assetType === 'series'
                                        ? 'bg-gold-mid text-background shadow-[0_15px_40px_rgba(212,175,55,0.3)] scale-105'
                                        : 'text-white/20 hover:text-white/60 hover:bg-white/5'}
                                `}
                            >
                                TV Series
                            </button>
                        </div>
                    </div>

                    {/* Series Metadata - Refined Grid */}
                    {assetType === 'series' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto animate-slide-up bg-gold-mid/[0.02] p-12 rounded-[3rem] border border-gold-mid/10">
                            <div className="space-y-6 group">
                                <label className="flex items-center gap-4 text-[10px] uppercase tracking-[0.6em] font-black text-gold-mid/40 px-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gold-mid/40 ring-4 ring-gold-mid/5" />
                                    Season Number
                                </label>
                                <input
                                    type="number"
                                    value={seasonNumber}
                                    onChange={(e) => setSeasonNumber(e.target.value)}
                                    min="1"
                                    placeholder="01"
                                    className="w-full bg-black/40 border border-white/5 rounded-[1.5rem] py-6 px-8 text-2xl font-black text-white text-center outline-none focus:border-gold-mid/40 focus:bg-gold-mid/5 transition-all transition-duration-500 placeholder:text-white/5"
                                    required
                                />
                            </div>
                            <div className="space-y-6 group">
                                <label className="flex items-center gap-4 text-[10px] uppercase tracking-[0.6em] font-black text-gold-mid/40 px-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gold-mid/40 ring-4 ring-gold-mid/5" />
                                    Episode Number
                                </label>
                                <input
                                    type="number"
                                    value={episodeNumber}
                                    onChange={(e) => setEpisodeNumber(e.target.value)}
                                    min="1"
                                    placeholder="01"
                                    className="w-full bg-black/40 border border-white/5 rounded-[1.5rem] py-6 px-8 text-2xl font-black text-white text-center outline-none focus:border-gold-mid/40 focus:bg-gold-mid/5 transition-all transition-duration-500 placeholder:text-white/5"
                                    required
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Metadata Fields - Full Width and Polished */}
                <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6 group">
                        <label className="text-[10px] uppercase tracking-[0.6em] font-black text-white/20 px-8 group-focus-within:text-gold-mid transition-colors duration-500">Inventory ID</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/5 rounded-full py-6 px-10 text-lg font-black text-white outline-none focus:border-gold-mid/40 focus:bg-white/[0.04] transition-all duration-500 backdrop-blur-xl placeholder:text-white/5 uppercase tracking-tight italic"
                            placeholder="e.g. BLADE RUNNER 2049"
                            required
                        />
                    </div>
                    <div className="space-y-6 group">
                        <label className="text-[10px] uppercase tracking-[0.6em] font-black text-white/20 px-8 group-focus-within:text-gold-mid transition-colors duration-500">Atmosphere Blueprint</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/5 rounded-full py-6 px-10 text-lg font-black text-white outline-none focus:border-gold-mid/40 focus:bg-white/[0.04] transition-all duration-500 backdrop-blur-xl placeholder:text-white/5 italic"
                            placeholder="Define the cinematic vibration..."
                        />
                    </div>
                </div>

                {/* Submission Area */}
                <div className="lg:col-span-12 flex flex-col items-center gap-12 pt-20">
                    <div className="relative group/btn">
                        <div className="absolute inset-0 bg-gold-mid/20 blur-[50px] opacity-0 group-hover/btn:opacity-100 transition-opacity rounded-full scale-125 transition-duration-1000" />
                        <ButtonPrimary
                            type="submit"
                            disabled={uploading || !file || !title}
                            fullWidth={false}
                            className={`
                                min-w-[360px] py-10 rounded-full text-lg uppercase tracking-[0.5em] font-black transition-all duration-700
                                ${uploading ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-105 active:scale-95 shadow-[0_20px_80px_-20px_rgba(212,175,55,0.4)]'}
                            `}
                        >
                            {uploading ? 'Transmission Active' : 'Commit to Vault'}
                        </ButtonPrimary>
                    </div>

                    {status === 'success' && (
                        <div className="flex flex-col items-center gap-4 animate-scale-in text-green-400">
                            <div className="w-16 h-16 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center shadow-[0_0_40px_rgba(74,222,128,0.2)]">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <span className="text-[11px] uppercase tracking-[0.6em] font-black">Archive Integrity Synchronized</span>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex items-center gap-6 text-red-400 animate-shake bg-red-400/5 py-4 px-10 rounded-full border border-red-400/10 shadow-2xl">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-[10px] uppercase tracking-[0.3em] font-black">{error}</span>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}
