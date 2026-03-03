import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme/tokens';
import { apiClient } from '../lib/api';
import { transformToCloudFront } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { useSession } from '../context/SessionContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { getUserFacingError } from '../lib/errors';

export const WatchHistoryScreen = ({ navigation }: any) => {
  const { showToast } = useToast();
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getWatchHistory(1, 20);
      setItems(data.watchHistory || []);
    } catch (error: any) {
      showToast({ message: getUserFacingError(error, ['failed to fetch watch history', 'failed to load history']), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const handleClear = () => {
    setConfirmClear(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Watch History</Text>
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={18} color={COLORS.accent.red} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold.mid} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {!user && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Sign in to view your watch history.</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Auth', { tab: 'login' })} style={styles.signInButton}>
                <Text style={styles.signInText}>Sign in</Text>
              </TouchableOpacity>
            </View>
          )}
          {items.map((item) => {
            const poster = transformToCloudFront(item.video?.thumbnailUrl || item.videoPoster);
            const percent = Math.round(item.completionPercent || 0);
            const video = item.video || {};
            const rawGenre = video.genre || '';
            const genres = rawGenre
              .split(',')
              .map((genre: string) => genre.trim())
              .filter(Boolean);
            const detailId = video.tmdbId ? String(video.tmdbId) : video.id || item.videoId;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate('TitleDetail', {
                    id: detailId,
                    movie: {
                      id: detailId,
                      title: video.title || item.videoTitle,
                      poster,
                      playable: true,
                      assetId: video.id || item.videoId,
                      cloudfrontUrl: transformToCloudFront(video.s3Url),
                      year: video.releaseYear || new Date().getFullYear(),
                      runtime: Math.floor((video.duration || 0) / 60),
                      genres,
                    },
                  })
                }
              >
                <Image source={{ uri: poster }} style={styles.poster} />
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>{item.videoTitle}</Text>
                  <Text style={styles.meta}>{percent}% watched</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.min(100, percent)}%` }]} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          {items.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No watch history yet.</Text>
            </View>
          )}
        </ScrollView>
      )}
      <ConfirmDialog
        visible={confirmClear}
        title="Clear history"
        message="This will remove your watch history."
        confirmText="Clear"
        tone="danger"
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          setConfirmClear(false);
          try {
            await apiClient.clearWatchHistory();
            setItems([]);
            showToast({ message: 'Watch history cleared.', type: 'success' });
          } catch (error: any) {
            showToast({ message: getUserFacingError(error, ['failed to clear history']), type: 'error' });
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 20,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 60,
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  name: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    color: COLORS.silver,
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(167,171,180,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.gold.mid,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.silver,
  },
  signInButton: {
    marginTop: 16,
    backgroundColor: COLORS.gold.mid,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  signInText: {
    color: COLORS.background,
    fontWeight: '700',
  },
});
