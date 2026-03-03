import { useCallback, useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useSession } from '../context/SessionContext';
import { apiClient } from '../lib/api';

export const buildWatchMetaMaps = (entries: any[] = []) => {
  const progressMap: Record<string, number> = {};
  const statusMap: Record<string, 'watching' | 'completed'> = {};
  const lastWatchedMap: Record<string, number> = {};

  entries.forEach((entry) => {
    const percent = Math.round(entry?.completionPercent || 0);
    const isCompleted = Boolean(entry?.isCompleted) || percent >= 90;
    const watchedAt = entry?.watchedAt ? new Date(entry.watchedAt).getTime() : Date.now();
    const video = entry?.video || {};
    const keys = [
      video.id,
      entry?.videoId,
      video.tmdbId !== undefined && video.tmdbId !== null ? String(video.tmdbId) : null,
    ];

    keys.forEach((key) => {
      if (!key) return;
      const normalized = String(key);
      lastWatchedMap[normalized] = watchedAt;
      if (isCompleted) {
        statusMap[normalized] = 'completed';
      } else if (percent > 0) {
        statusMap[normalized] = 'watching';
      }
      if (percent > 0 && percent < 100) {
        progressMap[normalized] = percent;
      }
    });
  });

  return { progressMap, statusMap, lastWatchedMap };
};

export const buildWatchProgressMap = (entries: any[] = []) => {
  return buildWatchMetaMaps(entries).progressMap;
};

export const useWatchProgress = (limit = 100) => {
  const { user } = useSession();
  const isFocused = useIsFocused();
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [statusMap, setStatusMap] = useState<Record<string, 'watching' | 'completed'>>({});
  const [lastWatchedMap, setLastWatchedMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setProgressMap({});
      return;
    }
    setLoading(true);
    try {
      const data = await apiClient.getWatchHistory(1, limit);
      const { progressMap: nextProgress, statusMap: nextStatus, lastWatchedMap: nextWatched } = buildWatchMetaMaps(data?.watchHistory || []);
      setProgressMap(nextProgress);
      setStatusMap(nextStatus);
      setLastWatchedMap(nextWatched);
    } catch {
      setProgressMap({});
      setStatusMap({});
      setLastWatchedMap({});
    } finally {
      setLoading(false);
    }
  }, [limit, user]);

  useEffect(() => {
    if (!isFocused) return;
    refresh();
  }, [isFocused, refresh]);

  return { progressMap, statusMap, lastWatchedMap, refresh, loading };
};
