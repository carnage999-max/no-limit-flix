import React from 'react';
import { TouchableOpacity, Image, Text, View, StyleSheet, Dimensions } from 'react-native';
import { MoviePick } from '../types';
import { COLORS, SPACING } from '../theme/tokens';
import { PermanenceBadge } from './PermanenceBadge';

const { width } = Dimensions.get('window');
const TILE_WIDTH = (width - SPACING.xl * 2 - SPACING.md) / 2;

interface TitleTileProps {
  movie: MoviePick;
  onPress: (id: string, movie: MoviePick) => void;
  width?: number;
}

export const TitleTile: React.FC<TitleTileProps> = ({ movie, onPress, width: customWidth }) => {
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
    aspectRatio: 2/3,
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
});
