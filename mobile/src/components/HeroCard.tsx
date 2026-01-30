import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MoviePick } from '../types';
import { COLORS, SPACING } from '../theme/tokens';
import { PermanenceBadge } from './PermanenceBadge';

const { width } = Dimensions.get('window');

interface HeroCardProps {
  movie: MoviePick;
  onViewDetails: (id: string) => void;
}

export const HeroCard: React.FC<HeroCardProps> = ({ movie, onViewDetails }) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={() => onViewDetails(movie.id)}
      style={styles.container}
    >
      <View style={styles.card}>
        <Image source={{ uri: movie.backdrop || movie.poster }} style={styles.backdrop} />
        <LinearGradient
          colors={['transparent', 'rgba(11, 11, 13, 0.5)', '#0B0B0D']}
          style={styles.gradient}
        />
        
        <View style={styles.content}>
          <PermanenceBadge type={movie.permanence} />
          <Text style={styles.title}>{movie.title}</Text>
          <Text style={styles.whyLabel}>WHY THIS MATCHES:</Text>
          <Text style={styles.explanation} numberOfLines={3}>{movie.explanation}</Text>
          
          <View style={styles.footer}>
             <Text style={styles.meta}>{movie.year}  ·  {movie.runtime}m</Text>
             <View style={styles.detailsBtn}>
                <Text style={styles.detailsBtnText}>View Details</Text>
             </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 24,
  },
  card: {
    height: 400,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1A1A1E',
    borderWidth: 1,
    borderColor: 'rgba(167, 171, 180, 0.2)',
  },
  backdrop: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  whyLabel: {
    color: COLORS.gold.mid,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  explanation: {
    color: COLORS.silver,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(167, 171, 180, 0.1)',
    paddingTop: 16,
  },
  meta: {
    color: COLORS.silver,
    fontSize: 14,
    opacity: 0.8,
  },
  detailsBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(167, 171, 180, 0.2)',
  },
  detailsBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  }
});
