import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { COLORS } from '../theme/tokens';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = (width - 40) * (9 / 16);

interface TrailerPlayerProps {
  videoId: string;
  onReady?: () => void;
}

export const TrailerPlayer: React.FC<TrailerPlayerProps> = ({ videoId, onReady }) => {
  const [loading, setLoading] = useState(true);

  const handleReady = useCallback(() => {
    setLoading(false);
    onReady?.();
  }, [onReady]);

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator color={COLORS.gold.mid} />
        </View>
      )}
      <YoutubePlayer
        height={VIDEO_HEIGHT}
        width={width - 40}
        videoId={videoId}
        onReady={handleReady}
        webViewProps={{
          allowsFullscreenVideo: true,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    aspectRatio: 16 / 9,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
  },
});
