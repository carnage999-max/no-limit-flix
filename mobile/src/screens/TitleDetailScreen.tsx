import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Dimensions,
  Linking,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import { ButtonPrimary, PermanenceBadge, TrailerPlayer } from '../components/index';
import { apiClient } from '../lib/api';
import { MoviePick, WatchProvider } from '../types';
import { useFavorites } from '../context/FavoritesContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { transformToCloudFront } from '../lib/utils';

const { width, height } = Dimensions.get('window');
const AUTOPLAY_KEY = '@nolimitflix_autoplay';

const getYoutubeId = (url?: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const TitleDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id, movie: passedMovie } = route.params || {};
  const { isFavorite, toggleFavorite } = useFavorites();

  const [movie, setMovie] = React.useState<MoviePick | null>(passedMovie || null);
  const [loading, setLoading] = React.useState(!movie?.explanation || !movie?.watchProviders);
  const [isPlayingTrailer, setIsPlayingTrailer] = React.useState(false);

  const videoId = getYoutubeId(movie?.trailerUrl);
  const isFav = movie ? isFavorite(movie.id) : false;

  const handleToggleFavorite = () => {
    if (movie) {
      toggleFavorite(movie);
    }
  };

  React.useEffect(() => {
    if ((!movie?.explanation || !movie?.watchProviders) && id) {
      loadMovieDetails();
    }
  }, [id]);

  React.useEffect(() => {
    const checkAutoPlay = async () => {
      if (movie && videoId && !isPlayingTrailer) {
        try {
          const value = await AsyncStorage.getItem(AUTOPLAY_KEY);
          if (value !== null && JSON.parse(value) === true) {
            setIsPlayingTrailer(true);
          }
        } catch (e) {
          console.error('Failed to check autoplay', e);
        }
      }
    };
    checkAutoPlay();
  }, [movie, videoId]);

  const loadMovieDetails = async () => {
    setLoading(true);
    try {
      const details = await apiClient.getTitleDetails(id);
      setMovie(details);
    } catch (error) {
      console.error('Failed to load movie details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.gold.mid} />
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: COLORS.silver }}>Movie not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: COLORS.gold.mid, marginTop: 10 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const backdropUri = transformToCloudFront(movie.backdrop || movie.poster);

  // CRITICAL: Ensure we use the direct asset cloudfrontUrl if available, 
  // or fallback to the movie's cloudfrontUrl.
  const playableUrl = movie.cloudfrontUrl ? transformToCloudFront(movie.cloudfrontUrl) : '';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Backdrop & Header */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: backdropUri }}
            style={styles.backdrop}
          />
          <LinearGradient
            colors={['rgba(11, 11, 13, 0)', 'rgba(11, 11, 13, 0.5)', COLORS.background]}
            style={styles.backdropGradient}
          />

          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerBackButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            {movie.playable && playableUrl ? (
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => navigation.navigate('Watch', {
                  videoUrl: playableUrl,
                  title: movie.title
                })}
              >
                <Ionicons name="play" size={24} color={COLORS.background} />
                <Text style={styles.playButtonText}>Play Now</Text>
              </TouchableOpacity>
            ) : null}

            {movie.trailerUrl && !isPlayingTrailer ? (
              <TouchableOpacity
                style={[styles.trailerButton, movie.playable && { flex: 1.2 }]}
                onPress={() => setIsPlayingTrailer(true)}
              >
                <Ionicons name="logo-youtube" size={20} color={COLORS.text} />
                <Text style={styles.trailerButtonText}>Trailer</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleToggleFavorite}
            >
              <Ionicons
                name={isFav ? "heart" : "heart-outline"}
                size={24}
                color={isFav ? "#EF4444" : COLORS.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.mainContent}>
          <View style={styles.titleSection}>
            <View style={{ flex: 1 }}>
              <Text style={styles.titleText}>{movie.title}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{movie.year}</Text>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.metaText}>{movie.runtime}m</Text>
                <Text style={styles.bullet}>•</Text>
                <View style={styles.genresRow}>
                  {(movie.genres || []).slice(0, 2).map((g, i) => (
                    <Text key={i} style={styles.metaText}>{g}{i < 1 && (movie.genres?.length || 0) > 1 ? ', ' : ''}</Text>
                  ))}
                </View>
              </View>
            </View>
            <PermanenceBadge type={movie.permanence || 'Permanent Core'} />
          </View>

          {movie.explanation && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Why this match?</Text>
              <Text style={styles.explanationText}>{movie.explanation}</Text>
            </View>
          )}

          {isPlayingTrailer && videoId && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Trailer</Text>
                <TouchableOpacity onPress={() => setIsPlayingTrailer(false)}>
                  <Text style={styles.closeTrailerText}>Close</Text>
                </TouchableOpacity>
              </View>
              <TrailerPlayer videoId={videoId} />
            </View>
          )}

          {movie.watchProviders && movie.watchProviders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Where to stream</Text>
              <View style={styles.providersGrid}>
                {movie.watchProviders.map((provider: WatchProvider, i: number) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.providerCard}
                    onPress={() => Linking.openURL(provider.link)}
                  >
                    <Image source={{ uri: provider.logoUrl }} style={styles.providerLogo} />
                    <Text style={styles.providerName} numberOfLines={1}>{provider.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    width: width,
    height: height * 0.55,
    position: 'relative',
  },
  backdrop: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backdropGradient: {
    position: 'absolute',
    inset: 0,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 11, 13, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRow: {
    position: 'absolute',
    bottom: -28,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  playButton: {
    flex: 2,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gold.mid,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: COLORS.gold.mid,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  playButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  trailerButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  trailerButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  favoriteButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mainContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  titleText: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: COLORS.silver,
    fontSize: 14,
    fontWeight: '500',
  },
  bullet: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 14,
  },
  genresRow: {
    flexDirection: 'row',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.gold.mid,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 16,
  },
  closeTrailerText: {
    color: COLORS.silver,
    fontSize: 12,
    fontWeight: '600',
  },
  explanationText: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 26,
    opacity: 0.9,
  },
  providersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  providerCard: {
    width: (width - 40 - 24) / 3,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  providerLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginBottom: 8,
  },
  providerName: {
    color: COLORS.silver,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
