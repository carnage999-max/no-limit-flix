'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from './SessionContext';

interface VideoFlagsContextType {
    /** True only for admins — every consumer uses this to decide whether to render flag controls. */
    canFlag: boolean;
    flaggedIds: Set<string>;
    busyId: string | null;
    error: string;
    flag: (videoId: string) => Promise<void>;
    unflag: (videoId: string) => Promise<void>;
}

const EMPTY_IDS: Set<string> = new Set();

const VideoFlagsContext = createContext<VideoFlagsContextType | undefined>(undefined);

/**
 * Admin-only state for "suspected wrong metadata" flags, shared app-wide so the flag list is
 * fetched once no matter how many movie tiles are on screen. Never calls the API for non-admins.
 */
export function VideoFlagsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useSession();
    const canFlag = user?.role === 'admin';

    const [flaggedIds, setFlaggedIds] = useState<Set<string>>(EMPTY_IDS);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!canFlag) {
            setFlaggedIds(EMPTY_IDS);
            return;
        }
        let cancelled = false;
        fetch('/api/admin/flags', { cache: 'no-store' })
            .then((response) => (response.ok ? response.json() : null))
            .then((data: { flags?: Array<{ videoId: string }> } | null) => {
                if (!cancelled && data?.flags) setFlaggedIds(new Set(data.flags.map((item) => item.videoId)));
            })
            .catch(() => null);
        return () => {
            cancelled = true;
        };
    }, [canFlag]);

    const change = useCallback(async (videoId: string, request: () => Promise<Response>, flagged: boolean) => {
        setBusyId(videoId);
        setError('');
        try {
            const response = await request();
            if (!response.ok) throw new Error('Request failed');
            setFlaggedIds((previous) => {
                const next = new Set(previous);
                if (flagged) next.add(videoId);
                else next.delete(videoId);
                return next;
            });
        } catch {
            setError('Could not update the flag. Try again.');
        } finally {
            setBusyId(null);
        }
    }, []);

    const flag = useCallback(
        (videoId: string) =>
            change(videoId, () => fetch('/api/admin/flags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId }),
            }), true),
        [change]
    );

    const unflag = useCallback(
        (videoId: string) =>
            change(videoId, () => fetch(`/api/admin/flags?videoId=${encodeURIComponent(videoId)}`, { method: 'DELETE' }), false),
        [change]
    );

    const value = useMemo<VideoFlagsContextType>(
        () => ({ canFlag, flaggedIds, busyId, error, flag, unflag }),
        [canFlag, flaggedIds, busyId, error, flag, unflag]
    );

    return <VideoFlagsContext.Provider value={value}>{children}</VideoFlagsContext.Provider>;
}

export function useVideoFlags(): VideoFlagsContextType {
    const context = useContext(VideoFlagsContext);
    if (!context) throw new Error('useVideoFlags must be used within a VideoFlagsProvider');
    return context;
}
