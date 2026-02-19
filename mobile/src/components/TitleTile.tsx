import React from 'react';
import { TouchableOpacity, Image, Text, View, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MoviePick } from '../types';
import { COLORS, SPACING } from '../theme/tokens';
import { PermanenceBadge } from './PermanenceBadge';
import { useFavorites } from '../context/FavoritesContext';

const { width } = Dimensions.get('window');
const TILE_WIDTH = (width - SPACING.xl * 2 - SPACING.md) / 2;

interface TitleTileProps {
  movie: MoviePick;
  onPress: (id: string, movie: MoviePick) => void;
  width?: number;
  key?: string | number;
}

export const TitleTile = ({ movie, onPress, width: customWidth }: TitleTileProps) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = isFavorite(movie.id);

  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    toggleFavorite(movie);
  };

  return (
    <TouchableOpacity
      style={[styles.container, customWidth ? { width: customWidth } : null]}
      onPress={() => onPress(movie.id, movie)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: movie.poster }} style={styles.poster} resizeMode="cover" />
        <View style={styles.badgeOverlay}>
          <PermanenceBadge type={movie.permanence} />
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isFav ? "heart" : "heart-outline"}
            size={20}
            color={isFav ? "#EF4444" : COLORS.text}
          />
        </TouchableOpacity>

        {movie.playable && (
          <View style={styles.playableTag}>
            <Ionicons name="play" size={10} color={COLORS.background} />
            <Text style={styles.playableTagText}>Play</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{movie.title}</Text>
        <Text style={styles.meta}>{movie.year} • {movie.runtime}m</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: TILE_WIDTH,
    marginBottom: 20,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(167, 171, 180, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167, 171, 180, 0.15)',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(11, 11, 13, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    marginTop: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  meta: {
    color: COLORS.silver,
    fontSize: 12,
    opacity: 0.8,
  },
  playableTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: COLORS.gold.mid,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    shadowColor: COLORS.gold.mid,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  playableTagText: {
    color: COLORS.background,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
