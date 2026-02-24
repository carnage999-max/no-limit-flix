'use client';

import { useState, useRef, CSSProperties } from 'react';
import { Upload, AlertCircle, CheckCircle2, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';

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
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
    },
    videosList: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '24px',
    },
    videoCard: {
        padding: '16px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.05) 0%, rgba(0,0,0,0.3) 100%)',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        cursor: 'pointer',
        transition: 'all 0.3s',
    },
    videoCardHover: {
        borderColor: 'rgba(212, 175, 55, 0.6)',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(0,0,0,0.4) 100%)',
    },
    videoThumbnail: {
        width: '100%',
        height: '140px',
        background: '#000',
        borderRadius: '8px',
        marginBottom: '12px',
        objectFit: 'cover',
    },
    videoTitle: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#F3F4F6',
        marginBottom: '4px',
    },
    videoMeta: {
        fontSize: '12px',
        color: '#A7ABB4',
    },
    form: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '32px',
        '@media (max-width: 768px)': {
            gridTemplateColumns: '1fr',
            gap: '24px',
        },
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    label: {
        fontSize: '12px',
        fontWeight: '700',
        color: '#D4AF37',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
    },
    input: {
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        borderRadius: '8px',
        color: '#F3F4F6',
        fontSize: '14px',
        fontFamily: 'inherit',
    },
    textarea: {
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        borderRadius: '8px',
        color: '#F3F4F6',
        fontSize: '14px',
        fontFamily: 'inherit',
        minHeight: '100px',
        resize: 'vertical',
    },
    thumbnailSection: {
        gridColumn: '1 / -1',
        display: 'flex',
        gap: '32px',
    },
    thumbnailPreview: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    thumbnailImage: {
        width: '100%',
        maxWidth: '300px',
        height: 'auto',
        borderRadius: '8px',
        background: '#000',
    },
    uploadBox: {
        padding: '24px',
        border: '2px dashed rgba(212, 175, 55, 0.3)',
        borderRadius: '12px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s',
        background: 'rgba(212, 175, 55, 0.02)',
    },
    uploadBoxHover: {
        borderColor: 'rgba(212, 175, 55, 0.6)',
        background: 'rgba(212, 175, 55, 0.1)',
    },
    uploadIcon: {
        marginBottom: '12px',
    },
    uploadText: {
        fontSize: '14px',
        color: '#F3F4F6',
        marginBottom: '4px',
    },
    uploadSubtext: {
        fontSize: '12px',
        color: '#A7ABB4',
    },
    buttons: {
        gridColumn: '1 / -1',
        display: 'flex',
        gap: '16px',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
    },
    status: {
        padding: '16px',
        borderRadius: '8px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        marginBottom: '24px',
    },
    statusSuccess: {
        background: 'rgba(74, 222, 128, 0.1)',
        border: '1px solid rgba(74, 222, 128, 0.3)',
        color: '#4ADE80',
    },
    statusError: {
        background: 'rgba(248, 113, 113, 0.1)',
        border: '1px solid rgba(248, 113, 113, 0.3)',
        color: '#F87171',
    },
    statusInfo: {
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        color: '#3B82F6',
    },
};

interface Video {
    id: string;
    title: string;
    description?: string;
    type: string;
    thumbnailUrl?: string;
    releaseYear?: number;
    tmdbId?: string;
}

interface EditFormData {
    title: string;
    description: string;
    releaseYear: string;
    tmdbId: string;
}

export default function AdminEditPage() {
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const [formData, setFormData] = useState<EditFormData>({
        title: '',
        description: '',
        releaseYear: '',
        tmdbId: '',
    });
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    // Search for a video by ID or title
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearchLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/edit/search?q=${encodeURIComponent(searchQuery)}`);
            if (!res.ok) throw new Error('Video not found');
            const data = await res.json();
            handleSelectVideo(data.video);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSelectVideo = (video: Video) => {
        setSelectedVideo(video);
        setFormData({
            title: video.title,
            description: video.description || '',
            releaseYear: video.releaseYear ? String(video.releaseYear) : '',
            tmdbId: video.tmdbId || '',
        });
        setThumbnailFile(null);
        setThumbnailPreview(video.thumbnailUrl || null);
        setError(null);
        setSuccess(null);
    };

    const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setThumbnailFile(file);
            const preview = URL.createObjectURL(file);
            setThumbnailPreview(preview);
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVideo) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            let newThumbnailUrl = selectedVideo.thumbnailUrl;

            // Upload new thumbnail if provided
            if (thumbnailFile) {
                const thumbRes = await fetch('/api/admin/edit/thumbnail-presigned-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: thumbnailFile.name,
                        fileType: thumbnailFile.type,
                        videoId: selectedVideo.id,
                    }),
                });

                if (!thumbRes.ok) throw new Error('Failed to get thumbnail upload URL');
                const { presignedUrl, s3Url } = await thumbRes.json();
                newThumbnailUrl = s3Url;

                // Upload to S3
                const uploadRes = await fetch(presignedUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': thumbnailFile.type },
                    body: thumbnailFile,
                });

                if (!uploadRes.ok) throw new Error('Failed to upload thumbnail');
            }

            // Update metadata
            const updateRes = await fetch(`/api/admin/edit/${selectedVideo.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    releaseYear: formData.releaseYear ? parseInt(formData.releaseYear) : null,
                    tmdbId: formData.tmdbId || null,
                    thumbnailUrl: newThumbnailUrl,
                }),
            });

            if (!updateRes.ok) throw new Error('Failed to update metadata');

            setSuccess('✓ Video metadata updated successfully!');
            setThumbnailFile(null);
            // Reload videos to reflect changes
            await loadVideos();
            setSelectedVideo(null);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    if (!selectedVideo) {
        return (
            <main style={{ background: '#0B0B0D', color: 'white', minHeight: '100vh' }}>
                <div style={styles.container}>
                    <div style={styles.header}>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <Link href="/admin/upload" style={styles.backLink}>
                                <ArrowLeft size={16} />
                                Back to Upload
                            </Link>
                            <Link href="/admin/settings" style={{
                                ...styles.backLink,
                                color: 'rgba(212, 175, 55, 0.6)'
                            }}>
                                ⚙️ Admin Settings
                            </Link>
                        </div>
                        <h1 style={styles.title}>Edit Metadata</h1>
                        <p style={styles.subtitle}>Search for a video to update its information</p>
                    </div>

                    {error && (
                        <div style={{ ...styles.status, ...styles.statusError }}>
                            <AlertCircle size={20} />
                            <div>{error}</div>
                        </div>
                    )}

                    <div style={{ ...styles.section, maxWidth: '500px', margin: '0 auto', padding: '0 24px' }}>
                        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Search by Video ID or Title</label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Enter video ID or title..."
                                    style={styles.input}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={searchLoading || !searchQuery.trim()}
                                style={{
                                    background: 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)',
                                    color: '#0B0B0D',
                                    padding: '12px 24px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: searchLoading || !searchQuery.trim() ? 'not-allowed' : 'pointer',
                                    opacity: (searchLoading || !searchQuery.trim()) ? 0.6 : 1,
                                    transition: 'all 0.3s',
                                }}
                            >
                                {searchLoading ? 'Searching...' : 'Search'}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main style={{ background: '#0B0B0D', color: 'white', minHeight: '100vh' }}>
            <div style={styles.container}>
                <div style={styles.header}>
                    <button
                        onClick={() => setSelectedVideo(null)}
                        style={{ ...styles.backLink, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <ArrowLeft size={16} />
                        Back to Videos
                    </button>
                    <h1 style={styles.title}>Edit Video</h1>
                    <p style={styles.subtitle}>{selectedVideo.title}</p>
                </div>

                {error && (
                    <div style={{ ...styles.status, ...styles.statusError }}>
                        <AlertCircle size={20} />
                        <div>{error}</div>
                    </div>
                )}

                {success && (
                    <div style={{ ...styles.status, ...styles.statusSuccess }}>
                        <CheckCircle2 size={20} />
                        <div>{success}</div>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ ...styles.section }}>
                    <div style={styles.form}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Title *</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleFormChange}
                                style={styles.input}
                                required
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Release Year</label>
                            <input
                                type="number"
                                name="releaseYear"
                                value={formData.releaseYear}
                                onChange={handleFormChange}
                                style={styles.input}
                                placeholder="YYYY"
                                min="1900"
                                max={new Date().getFullYear()}
                            />
                        </div>

                        <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                            <label style={styles.label}>Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleFormChange}
                                style={styles.textarea}
                                placeholder="Enter video description..."
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>TMDb ID</label>
                            <input
                                type="text"
                                name="tmdbId"
                                value={formData.tmdbId}
                                onChange={handleFormChange}
                                style={styles.input}
                                placeholder="e.g., 550"
                            />
                        </div>

                        <div style={{ ...styles.formGroup, ...styles.thumbnailSection }}>
                            <div style={styles.thumbnailPreview}>
                                <label style={styles.label}>Current Thumbnail</label>
                                {thumbnailPreview ? (
                                    <>
                                        <img
                                            src={thumbnailPreview}
                                            alt="Thumbnail preview"
                                            style={styles.thumbnailImage}
                                        />
                                        {thumbnailFile && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setThumbnailFile(null);
                                                    setThumbnailPreview(selectedVideo.thumbnailUrl || null);
                                                }}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: 'rgba(248, 113, 113, 0.1)',
                                                    border: '1px solid rgba(248, 113, 113, 0.3)',
                                                    color: '#F87171',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                }}
                                            >
                                                <X size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                                Discard Upload
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div style={{ color: '#A7ABB4', fontSize: '14px' }}>No thumbnail</div>
                                )}
                            </div>

                            <div style={styles.thumbnailPreview}>
                                <label style={styles.label}>Update Thumbnail</label>
                                <div
                                    style={styles.uploadBox}
                                    onMouseEnter={e => Object.assign(e.currentTarget.style, styles.uploadBoxHover)}
                                    onMouseLeave={e => Object.assign(e.currentTarget.style, styles.uploadBox)}
                                    onClick={() => thumbnailInputRef.current?.click()}
                                >
                                    <div style={styles.uploadIcon}>
                                        <Upload size={32} style={{ margin: '0 auto', color: '#D4AF37' }} />
                                    </div>
                                    <div style={styles.uploadText}>Click to upload new thumbnail</div>
                                    <div style={styles.uploadSubtext}>PNG, JPG, WEBP up to 10MB</div>
                                </div>
                                <input
                                    ref={thumbnailInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleThumbnailSelect}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={styles.buttons}>
                            <button
                                type="button"
                                onClick={() => setSelectedVideo(null)}
                                style={{
                                    padding: '12px 24px',
                                    background: 'transparent',
                                    border: '1px solid rgba(212, 175, 55, 0.3)',
                                    color: '#D4AF37',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    background: 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)',
                                    color: '#0B0B0D',
                                    padding: '12px 24px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.6 : 1,
                                    transition: 'all 0.3s',
                                }}
                            >
                                {loading ? 'Updating...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </main>
    );
}
