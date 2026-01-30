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
import { MoviePick } from '../types';
import { useFavorites } from '../context/FavoritesContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
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
  // Only skip loading if we have the full details (explanation and watchProviders)
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Backdrop Photo */}
        <View style={styles.backdropContainer}>
          <Image 
            source={{ uri: movie.backdrop }} 
            style={styles.backdrop} 
          />
          <LinearGradient
            colors={['rgba(11, 11, 13, 0.4)', 'rgba(11, 11, 13, 0.7)', COLORS.background]}
            style={StyleSheet.absoluteFill}
          />
          
          {/* Header Buttons */}
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={28} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerFavoriteButton}
              onPress={handleToggleFavorite}
            >
              <Ionicons 
                name={isFav ? "heart" : "heart-outline"} 
                size={28} 
                color={isFav ? "#EF4444" : COLORS.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Header */}
        <View style={styles.mainInfo}>
          <Image source={{ uri: movie.poster }} style={styles.poster} />
          <View style={styles.titleInfo}>
            <Text style={styles.title}>{movie.title}</Text>
            <Text style={styles.meta}>
              {movie.year}  ·  {movie.runtime} min
            </Text>
            <View style={styles.badgeRow}>
              <PermanenceBadge type={movie.permanence} />
            </View>
          </View>
        </View>

        {/* Content Details */}
        <View style={styles.body}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why you might like this</Text>
            <Text style={styles.explanationText}>{movie.explanation || 'Loading details...'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Genres</Text>
            <View style={styles.genreList}>
              {movie.genres?.map(genre => (
                <View key={genre} style={styles.genreBadge}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          </View>

          {movie.trailerUrl && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trailer</Text>
              {isPlayingTrailer && videoId ? (
                <TrailerPlayer videoId={videoId} />
              ) : (
                <ButtonPrimary 
                  onPress={() => setIsPlayingTrailer(true)}
                  fullWidth
                >
                  Watch Trailer
                </ButtonPrimary>
              )}
            </View>
          )}

          {movie.watchProviders && movie.watchProviders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Where to watch</Text>
              <View style={styles.providersGrid}>
                {movie.watchProviders.map((provider, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.providerCard}
                    onPress={() => Linking.openURL(provider.link)}
                  >
                    <Image source={{ uri: provider.logoUrl }} style={styles.providerLogo} />
                    <Text style={styles.providerName}>{provider.name}</Text>
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
    paddingBottom: 140,
  },
  backdropContainer: {
    height: 350,
    width: '100%',
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  headerButtons: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 11, 13, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerFavoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 11, 13, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainInfo: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    marginTop: -100,
    alignItems: 'flex-end',
    gap: 20,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(167, 171, 180, 0.2)',
  },
  titleInfo: {
    flex: 1,
    paddingBottom: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {
    color: COLORS.silver,
    fontSize: 16,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  body: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: COLORS.gold.mid,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },
  explanationText: {
    color: COLORS.text,
    fontSize: 17,
    lineHeight: 26,
  },
  genreList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genreBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(167, 171, 180, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(167, 171, 180, 0.1)',
  },
  genreText: {
    color: COLORS.silver,
    fontSize: 13,
    fontWeight: '600',
  },
  providersGrid: {
    gap: 12,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(167, 171, 180, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(167, 171, 180, 0.1)',
  },
  providerLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 16,
  },
  providerName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
