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
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
            if (!title) {
                const nameWithoutExt = e.target.files[0].name.replace(/\.[^/.]+$/, "");
                setTitle(nameWithoutExt);
            }
        }
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

            const { presignedUrl, videoId } = await res.json();
            const xhr = new XMLHttpRequest();

            const uploadPromise = new Promise((resolve, reject) => {
                xhr.open('PUT', presignedUrl);
                xhr.setRequestHeader('Content-Type', file.type);
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        setProgress(Math.round((event.loaded / event.total) * 100));
                    }
                };
                xhr.onload = () => {
                    if (xhr.status === 200) resolve(true);
                    else reject(new Error(`S3 upload failed (${xhr.status})`));
                };
                xhr.onerror = () => reject(new Error('Network error during S3 upload'));
                xhr.send(file);
            });

            await uploadPromise;

            const completeRes = await fetch('/api/admin/upload/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId, fileSize: file.size }),
            });

            if (!completeRes.ok) throw new Error('Database sync failed');

            setStatus('success');
            setFile(null);
            setTitle('');
            setDescription('');
            setSeasonNumber('');
            setEpisodeNumber('');
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
            setStatus('error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 sm:space-y-16 py-8 sm:py-12 px-4 sm:px-6">
            {/* Header Area */}
            <div className="text-center space-y-4 sm:space-y-8 animate-fade-in">
                <Link
                    href="/admin"
                    className="group inline-flex items-center gap-3 text-silver/40 hover:text-gold-mid transition-all text-[10px] uppercase tracking-[0.4em] font-black"
                >
                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
                </Link>
                <div className="space-y-2">
                    <h1 className="text-display gold-gradient-text uppercase leading-none tracking-tighter">
                        Library Integration
                    </h1>
                    <p className="text-[0.875rem] sm:text-subheading text-white/40 font-medium tracking-wide">
                        Authorized uplink for permanent cinematic assets.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-12">
                {/* File Upload Zone */}
                <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`
                        relative w-full min-h-[250px] sm:min-h-[350px] flex flex-col items-center justify-center gap-6 sm:gap-8 cursor-pointer transition-all duration-700 rounded-[2rem] sm:rounded-[3rem] overflow-hidden group
                        ${file ? 'bg-gold-mid/5 border border-gold-mid shadow-[0_0_100px_rgba(212,175,55,0.15)]' : 'bg-white/[0.02] border-2 border-dashed border-white/10 hover:border-gold-mid/40 hover:bg-white/[0.05] backdrop-blur-3xl'}
                        ${uploading ? 'cursor-not-allowed pointer-events-none' : ''}
                    `}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" className="hidden" />

                    {file ? (
                        <div className="text-center space-y-4 sm:space-y-6 px-4 sm:px-12 animate-scale-in">
                            <div className="relative inline-block">
                                <div className="w-16 h-16 sm:w-24 h-24 gold-gradient rounded-[1.25rem] sm:rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl rotate-12 transition-transform group-hover:rotate-0 duration-500">
                                    <FileVideo className="w-8 h-8 sm:w-12 h-12 text-background" />
                                </div>
                                <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-white text-background rounded-full p-1.5 sm:p-2 shadow-lg">
                                    <Sparkles className="w-3 h-3 sm:w-4 h-4" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl sm:text-3xl font-black text-white tracking-tighter break-all">{file.name}</h3>
                                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                                    <span className="text-[9px] sm:text-[10px] text-gold-mid uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black">Ready for Handshake</span>
                                    <div className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
                                    <span className="text-[9px] sm:text-[10px] text-silver/40 uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                className="text-[10px] text-silver/30 hover:text-white transition-colors underline uppercase tracking-[0.3em] sm:tracking-[0.4em] font-black"
                            >
                                Replace Selection
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-6 sm:gap-8 group">
                            <div className="w-16 h-16 sm:w-20 h-20 rounded-[1.25rem] sm:rounded-[2rem] border border-white/10 flex items-center justify-center group-hover:border-gold-mid/50 group-hover:scale-110 transition-all duration-700 bg-white/[0.02]">
                                <Upload className="w-6 h-6 sm:w-8 h-8 text-silver/20 group-hover:text-gold-mid group-hover:animate-bounce" />
                            </div>
                            <div className="text-center space-y-2 px-4">
                                <p className="text-lg sm:text-2xl font-black text-silver group-hover:text-white transition-colors tracking-tight uppercase">Drop Cinematic Asset</p>
                                <p className="text-[9px] sm:text-[10px] text-silver/30 uppercase tracking-[0.3em] sm:tracking-[0.5em] font-black">Validated Formats: MP4, MOV, WEBM</p>
                            </div>
                        </div>
                    )}

                    {uploading && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl rounded-[2rem] sm:rounded-[3rem] flex flex-col items-center justify-center p-8 sm:p-16 space-y-6 sm:space-y-8 animate-fade-in">
                            <div className="text-center space-y-4">
                                <div className="relative">
                                    <Loader2 className="w-12 h-12 sm:w-16 h-16 animate-spin text-gold-mid mx-auto opacity-20" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Upload className="w-5 h-5 sm:w-6 h-6 text-gold-mid" />
                                    </div>
                                </div>
                                <h2 className="text-2xl sm:text-4xl font-black gold-gradient-text uppercase tracking-tighter">Syncing to S3</h2>
                            </div>
                            <div className="w-full max-w-md space-y-4">
                                <div className="w-full bg-white/5 rounded-full h-1.5 sm:h-2 overflow-hidden p-0.5 border border-white/5">
                                    <div className="gold-gradient h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="flex justify-between items-center text-[9px] sm:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.5em] font-black text-gold-mid">
                                    <span className="animate-pulse">Handshaking...</span>
                                    <span className="text-2xl sm:text-3xl font-black text-white ml-auto">{progress}%</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Classification Selector */}
                <div className="flex flex-col items-center gap-6 sm:gap-10 animate-fade-in delay-100">
                    <label className="text-[10px] sm:text-[11px] uppercase tracking-[0.6em] font-black text-silver/30">
                        Content Classification
                    </label>
                    <div className="flex p-2 bg-white/[0.03] backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setAssetType('movie')}
                            className={`
                                px-8 sm:px-12 py-3 sm:py-4 rounded-full text-[10px] sm:text-[12px] uppercase tracking-[0.3em] font-black transition-all duration-500
                                ${assetType === 'movie' ? 'bg-gold-mid text-background shadow-[0_10px_30px_rgba(212,175,55,0.4)] scale-105' : 'text-silver/50 hover:text-white hover:bg-white/5'}
                            `}
                        >
                            Feature Film
                        </button>
                        <button
                            type="button"
                            onClick={() => setAssetType('series')}
                            className={`
                                px-8 sm:px-12 py-3 sm:py-4 rounded-full text-[10px] sm:text-[12px] uppercase tracking-[0.3em] font-black transition-all duration-500
                                ${assetType === 'series' ? 'bg-gold-mid text-background shadow-[0_10px_30px_rgba(212,175,55,0.4)] scale-105' : 'text-silver/50 hover:text-white hover:bg-white/5'}
                            `}
                        >
                            TV Series
                        </button>
                    </div>
                </div>

                {/* Series Metadata (Conditional) */}
                {assetType === 'series' && (
                    <div className="grid grid-cols-2 gap-6 sm:gap-12 animate-slide-up bg-gold-mid/[0.02] p-8 sm:p-12 rounded-[2rem] border border-gold-mid/10">
                        <div className="space-y-4 group">
                            <label className="text-[9px] sm:text-[10px] uppercase tracking-[0.4em] sm:tracking-[0.5em] font-black text-gold-mid/60 px-6 group-focus-within:text-gold-mid transition-colors">Season Number</label>
                            <input
                                type="number"
                                value={seasonNumber}
                                onChange={(e) => setSeasonNumber(e.target.value)}
                                min="1"
                                placeholder="01"
                                style={{
                                    width: '100%',
                                    padding: '1.25rem 1.5rem',
                                    background: 'rgba(167, 171, 180, 0.05)',
                                    border: '1px solid rgba(212, 175, 55, 0.2)',
                                    borderRadius: '9999px',
                                    fontSize: 'clamp(1rem, 4vw, 1.25rem)',
                                    color: '#F3F4F6',
                                    outline: 'none',
                                    transition: 'all 0.3s',
                                    textAlign: 'center',
                                    fontWeight: '900'
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = '#D4AF37';
                                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.05)';
                                    e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.15)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.2)';
                                    e.currentTarget.style.background = 'rgba(167, 171, 180, 0.05)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                                required
                            />
                        </div>
                        <div className="space-y-4 group">
                            <label className="text-[9px] sm:text-[10px] uppercase tracking-[0.4em] sm:tracking-[0.5em] font-black text-gold-mid/60 px-6 group-focus-within:text-gold-mid transition-colors">Episode Number</label>
                            <input
                                type="number"
                                value={episodeNumber}
                                onChange={(e) => setEpisodeNumber(e.target.value)}
                                min="1"
                                placeholder="01"
                                style={{
                                    width: '100%',
                                    padding: '1.25rem 1.5rem',
                                    background: 'rgba(167, 171, 180, 0.05)',
                                    border: '1px solid rgba(212, 175, 55, 0.2)',
                                    borderRadius: '9999px',
                                    fontSize: 'clamp(1rem, 4vw, 1.25rem)',
                                    color: '#F3F4F6',
                                    outline: 'none',
                                    transition: 'all 0.3s',
                                    textAlign: 'center',
                                    fontWeight: '900'
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = '#D4AF37';
                                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.05)';
                                    e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.15)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.2)';
                                    e.currentTarget.style.background = 'rgba(167, 171, 180, 0.05)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                                required
                            />
                        </div>
                    </div>
                )}

                {/* Input Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12">
                    <div className="space-y-4 group">
                        <label className="text-[9px] sm:text-[10px] uppercase tracking-[0.4em] sm:tracking-[0.5em] font-black text-silver/40 px-6 group-focus-within:text-gold-mid transition-colors">Library Reference</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1.25rem 1.5rem',
                                background: 'rgba(167, 171, 180, 0.05)',
                                border: '1px solid rgba(167, 171, 180, 0.2)',
                                borderRadius: '9999px',
                                fontSize: 'clamp(0.875rem, 4vw, 1.125rem)',
                                color: '#F3F4F6',
                                outline: 'none',
                                transition: 'all 0.3s',
                                backdropFilter: 'blur(10px)'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#D4AF37';
                                e.currentTarget.style.background = 'rgba(167, 171, 180, 0.1)';
                                e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.15)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.2)';
                                e.currentTarget.style.background = 'rgba(167, 171, 180, 0.05)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            placeholder="e.g. Inception — Master File"
                            required
                        />
                    </div>
                    <div className="space-y-4 group">
                        <label className="text-[9px] sm:text-[10px] uppercase tracking-[0.4em] sm:tracking-[0.5em] font-black text-silver/40 px-6 group-focus-within:text-gold-mid transition-colors">Vibe Signature</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1.25rem 1.5rem',
                                background: 'rgba(167, 171, 180, 0.05)',
                                border: '1px solid rgba(167, 171, 180, 0.2)',
                                borderRadius: '9999px',
                                fontSize: 'clamp(0.875rem, 4vw, 1.125rem)',
                                color: '#F3F4F6',
                                outline: 'none',
                                transition: 'all 0.3s',
                                backdropFilter: 'blur(10px)'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#D4AF37';
                                e.currentTarget.style.background = 'rgba(167, 171, 180, 0.1)';
                                e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.15)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.2)';
                                e.currentTarget.style.background = 'rgba(167, 171, 180, 0.05)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            placeholder="Why does this fit the collection?"
                        />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-8 sm:gap-12 pt-8 sm:pt-24">
                    <ButtonPrimary
                        type="submit"
                        disabled={uploading || !file || !title}
                        fullWidth
                        className={`sm:min-w-[360px] sm:w-auto ${uploading ? 'opacity-50 grayscale' : 'shadow-[0_20px_60px_-10px_rgba(212,175,55,0.3)]'}`}
                    >
                        {uploading ? 'Uplink Busy...' : 'Authorize Integration'}
                    </ButtonPrimary>

                    {status === 'success' && (
                        <div className="flex flex-col items-center gap-3 sm:gap-4 animate-scale-in">
                            <div className="w-10 h-10 sm:w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                                <CheckCircle2 className="w-5 h-5 sm:w-6 h-6 text-green-400" />
                            </div>
                            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.4em] sm:tracking-[0.6em] font-black text-green-400">Library Sync Complete</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex items-center gap-3 text-red-500 animate-shake bg-red-500/5 py-3 px-6 rounded-full border border-red-500/10">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] font-black truncate max-w-[200px] sm:max-w-none">{error}</span>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}
