'use client';

import { useState, useRef, CSSProperties } from 'react';
import { Upload, FileVideo, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { ButtonPrimary } from '@/components';
import Link from 'next/link';

// Define styles as constants for reuse and cleanliness
const styles: Record<string, CSSProperties> = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '60px 24px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: '80px',
    },
    header: {
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
    },
    backLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.5em',
        fontWeight: 900,
        color: 'rgba(255, 255, 255, 0.2)',
        textDecoration: 'none',
        transition: 'all 0.3s',
    },
    title: {
        fontSize: 'clamp(2.5rem, 8vw, 5rem)',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '-0.05em',
        lineHeight: 1,
        margin: 0,
        background: 'linear-gradient(to bottom, #FFFFFF 0%, #D4AF37 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    subtitle: {
        fontSize: '18px',
        color: 'rgba(255, 255, 255, 0.3)',
        fontWeight: 500,
        fontStyle: 'italic',
        maxWidth: '600px',
        margin: 0,
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '60px',
    },
    uploadZone: {
        position: 'relative',
        width: '100%',
        minHeight: '450px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '40px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'rgba(255, 255, 255, 0.01)',
        backdropFilter: 'blur(40px)',
        cursor: 'pointer',
        transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
        overflow: 'hidden',
    },
    uploadInner: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '40px',
        padding: '40px',
    },
    previewCard: {
        width: '100%',
        maxWidth: '800px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
    },
    thumbWrapper: {
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        boxShadow: '0 40px 100px -20px rgba(0,0,0,0.5)',
    },
    assetName: {
        fontSize: '24px',
        fontWeight: 900,
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: '-0.02em',
        textAlign: 'center',
        margin: 0,
    },
    inputSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    label: {
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.4em',
        fontWeight: 900,
        color: 'rgba(212, 175, 55, 0.5)',
        paddingLeft: '20px',
    },
    input: {
        width: '100%',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '100px',
        padding: '24px 32px',
        fontSize: '16px',
        color: '#FFFFFF',
        fontWeight: 700,
        outline: 'none',
        transition: 'all 0.3s',
    },
    typeSelector: {
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '100px',
        padding: '8px',
        width: 'fit-content',
        margin: '0 auto',
        border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    typeButton: {
        padding: '16px 40px',
        borderRadius: '80px',
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.3em',
        fontWeight: 900,
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.4s',
    },
    seriesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '24px',
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto',
    },
    submitWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px',
        paddingTop: '40px',
    },
    progressBar: {
        width: '100%',
        height: '4px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '10px',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #D4AF37 0%, #F3F4F6 100%)',
        transition: 'width 0.3s',
    }
};

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
    const [thumbError, setThumbError] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const videoFile = e.target.files[0];
            setFile(videoFile);
            setStatus('idle');
            setThumbError(false);
            setThumbnailPreview(null);

            if (!title) {
                const nameWithoutExt = videoFile.name.replace(/\.[^/.]+$/, "");
                setTitle(nameWithoutExt);
            }

            extractThumbnail(videoFile);
        }
    };

    const extractThumbnail = (videoFile: File) => {
        const video = document.createElement('video');
        video.style.display = 'none';
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        const videoUrl = URL.createObjectURL(videoFile);
        video.src = videoUrl;

        const cleanup = () => {
            URL.revokeObjectURL(videoUrl);
            video.remove();
        };

        const timeout = setTimeout(() => {
            console.error('Thumbnail extraction timed out');
            setThumbError(true);
            cleanup();
        }, 10000);

        video.onloadedmetadata = () => {
            // Seek to 1s or 10% of duration
            const timeToSeek = Math.min(1, video.duration / 10);
            video.currentTime = timeToSeek;
        };

        video.onseeked = () => {
            clearTimeout(timeout);
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx && canvas.width > 0 && canvas.height > 0) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const thumbFile = new File([blob], 'auto-thumb.jpg', { type: 'image/jpeg' });
                        setThumbnailFile(thumbFile);
                        setThumbnailPreview(URL.createObjectURL(blob));
                    }
                    cleanup();
                }, 'image/jpeg', 0.8);
            } else {
                setThumbError(true);
                cleanup();
            }
        };

        video.onerror = () => {
            clearTimeout(timeout);
            console.error('Video loading error during thumbnail extraction');
            setThumbError(true);
            cleanup();
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
        <div style={styles.container}>
            <div style={styles.header}>
                <Link href="/admin" style={styles.backLink}>
                    <ArrowLeft size={12} /> Mission Control
                </Link>
                <h1 style={styles.title}>Library Ingestion</h1>
                <p style={styles.subtitle}>Securing cinematic assets into the vault. Automatic archival enabled.</p>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
                {/* Upload Zone */}
                <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    style={{
                        ...styles.uploadZone,
                        borderColor: file ? 'rgba(212, 175, 55, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                        boxShadow: file ? '0 0 80px rgba(212, 175, 55, 0.1)' : 'none'
                    }}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" style={{ display: 'none' }} />

                    {file ? (
                        <div style={styles.previewCard}>
                            <div style={styles.thumbWrapper}>
                                {thumbnailPreview ? (
                                    <img src={thumbnailPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                                ) : thumbError ? (
                                    <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                        <FileVideo size={48} color="rgba(255,255,255,0.1)" />
                                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>Preview Unavailable</span>
                                    </div>
                                ) : (
                                    <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Loader2 className="animate-spin" color="rgba(212, 175, 55, 0.5)" />
                                    </div>
                                )}
                            </div>
                            <h3 style={styles.assetName}>{file.name}</h3>
                        </div>
                    ) : (
                        <div style={styles.uploadInner}>
                            <div style={{ padding: '24px', borderRadius: '30px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Upload size={32} color="rgba(255,255,255,0.2)" />
                            </div>
                            <div style={{ textAlign: 'center', gap: '8px', display: 'flex', flexDirection: 'column' }}>
                                <p style={{ fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', color: '#FFF' }}>Inject Feed</p>
                                <p style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.4em' }}>MP4, MOV, WEBM</p>
                            </div>
                        </div>
                    )}

                    {uploading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '40px', zIndex: 100 }}>
                            <div style={{ textAlign: 'center', gap: '16px', display: 'flex', flexDirection: 'column' }}>
                                <Loader2 size={64} className="animate-spin" color="#D4AF37" />
                                <h2 style={{ fontSize: '32px', fontWeight: 900, textTransform: 'uppercase', color: '#FFF' }}>Broadcasting...</h2>
                            </div>
                            <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={styles.progressBar}>
                                    <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 900, color: '#D4AF37' }}>
                                    <span>Transmitting</span>
                                    <span>{progress}%</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Metadata Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
                    <div style={styles.inputSection}>
                        <label style={styles.label}>Inventory ID</label>
                        <input
                            style={styles.input}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. BLADE RUNNER 2049"
                            required
                        />
                    </div>
                    <div style={styles.inputSection}>
                        <label style={styles.label}>Atmosphere Blueprint</label>
                        <input
                            style={styles.input}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Define the vibration..."
                        />
                    </div>
                </div>

                {/* Type Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', textAlign: 'center' }}>
                    <label style={styles.label}>Classification</label>
                    <div style={styles.typeSelector}>
                        <button
                            type="button"
                            onClick={() => setAssetType('movie')}
                            style={{
                                ...styles.typeButton,
                                background: assetType === 'movie' ? '#D4AF37' : 'transparent',
                                color: assetType === 'movie' ? '#000' : 'rgba(255,255,255,0.4)'
                            }}
                        >
                            Feature
                        </button>
                        <button
                            type="button"
                            onClick={() => setAssetType('series')}
                            style={{
                                ...styles.typeButton,
                                background: assetType === 'series' ? '#D4AF37' : 'transparent',
                                color: assetType === 'series' ? '#000' : 'rgba(255,255,255,0.4)'
                            }}
                        >
                            Series
                        </button>
                    </div>
                </div>

                {/* Series Specifics */}
                {assetType === 'series' && (
                    <div style={styles.seriesGrid}>
                        <div style={styles.inputSection}>
                            <label style={styles.label}>Season</label>
                            <input
                                style={{ ...styles.input, textAlign: 'center' }}
                                type="number"
                                value={seasonNumber}
                                onChange={e => setSeasonNumber(e.target.value)}
                                placeholder="01"
                            />
                        </div>
                        <div style={styles.inputSection}>
                            <label style={styles.label}>Episode</label>
                            <input
                                style={{ ...styles.input, textAlign: 'center' }}
                                type="number"
                                value={episodeNumber}
                                onChange={e => setEpisodeNumber(e.target.value)}
                                placeholder="01"
                            />
                        </div>
                    </div>
                )}

                {/* Submition Area */}
                <div style={styles.submitWrapper}>
                    <ButtonPrimary
                        type="submit"
                        disabled={uploading || !file || !title}
                        style={{ padding: '24px 80px', fontSize: '18px' }}
                    >
                        {uploading ? 'Uplink Active...' : 'Commit to Vault'}
                    </ButtonPrimary>

                    {status === 'success' && (
                        <div style={{ color: '#4ADE80', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CheckCircle2 size={16} /> Archive Integrity Verified
                        </div>
                    )}

                    {status === 'error' && (
                        <div style={{ color: '#F87171', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(248, 113, 113, 0.1)', padding: '16px 32px', borderRadius: '100px' }}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}

