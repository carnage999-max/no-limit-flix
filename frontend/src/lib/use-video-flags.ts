'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Admin-only state for "suspected wrong metadata" flags: which movies are flagged, plus actions
 * to flag or clear one. Does nothing (and never calls the API) unless `enabled` is true.
 */
export function useVideoFlags(enabled: boolean) {
    const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        fetch('/api/admin/flags', { cache: 'no-store' })
            .then((response) => (response.ok ? response.json() : null))
            .then((data: { flags?: Array<{ videoId: string }> } | null) => {
                if (!cancelled && data?.flags) setFlaggedIds(new Set(data.flags.map((flag) => flag.videoId)));
            })
            .catch(() => null);
        return () => {
            cancelled = true;
        };
    }, [enabled]);

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
        (videoId: string, reason?: string) =>
            change(videoId, () => fetch('/api/admin/flags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId, reason }),
            }), true),
        [change]
    );

    const unflag = useCallback(
        (videoId: string) =>
            change(videoId, () => fetch(`/api/admin/flags?videoId=${encodeURIComponent(videoId)}`, { method: 'DELETE' }), false),
        [change]
    );

    return { flaggedIds, busyId, error, flag, unflag };
}
