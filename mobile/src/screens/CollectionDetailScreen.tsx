import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import { TitleTile } from '../components';
import { COLLECTIONS } from '../lib/constants';
import { apiClient } from '../lib/api';
import { MoviePick } from '../types';

const { width } = Dimensions.get('window');

const FILTERS = {
  length: ['Short', 'Medium', 'Long'],
  intensity: ['Low', 'Medium', 'High'],
  tone: ['Light', 'Neutral', 'Heavy'],
};

export const CollectionDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id } = route.params || {};
  const collection = COLLECTIONS.find(c => c.slug === id) || COLLECTIONS[0];

  const [movies, setMovies] = useState<MoviePick[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    length: 'Medium',
    intensity: 'Medium',
    tone: 'Neutral',
  });

  const filteredMovies = React.useMemo(() => {
    return movies.filter(movie => {
      // Length Filter
      const runtime = movie.runtime || 120;
      if (activeFilters.length === 'Short' && runtime >= 90) return false;
      if (activeFilters.length === 'Medium' && (runtime < 90 || runtime > 140)) return false;
      if (activeFilters.length === 'Long' && runtime <= 140) return false;
      
      // Other filters (Intensity/Tone) are simulated as we don't have deep metadata here
      // but choosing 'High' intensity could filter for Action/Thriller genres if we wanted.
      
      return true;
    });
  }, [movies, activeFilters]);

  React.useEffect(() => {
    if (id) {
      loadCollectionMovies();
    }
  }, [id]);

  const loadCollectionMovies = async () => {
    try {
      const results = await apiClient.getMoviesByCollection(id);
      setMovies(results);
    } catch (error) {
      console.error('Failed to load collection movies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCollectionMovies();
  };

  const toggleFilter = (category: string, value: string) => {
    setActiveFilters(prev => ({ ...prev, [category]: value }));
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={collection.accentColor}
            colors={[collection.accentColor]}
          />
        }
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.silver} />
          <Text style={styles.backText}>All Collections</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: collection.accentColor }]}>{collection.title}</Text>
        <Text style={styles.promiseText}>{collection.description}</Text>

        <View style={styles.filtersSection}>
          {Object.entries(FILTERS).map(([category, options]) => (
            <View key={category} style={styles.filterRow}>
              <Text style={styles.filterLabel}>{category}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => toggleFilter(category, option)}
                    style={[
                      styles.filterChip,
                      (activeFilters as any)[category] === option && {
                        backgroundColor: collection.accentColor + '22',
                        borderColor: collection.accentColor,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.filterText,
                      (activeFilters as any)[category] === option && { color: collection.accentColor }
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={collection.accentColor} />
            <Text style={styles.loaderText}>Loading collection...</Text>
          </View>
        ) : filteredMovies.length > 0 ? (
          <View style={styles.grid}>
            {filteredMovies.map((movie: MoviePick) => (
              <TitleTile 
                key={movie.id} 
                movie={movie} 
                onPress={(movieId: string) => navigation.navigate('TitleDetail', { id: movieId, movie })}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No movies match these filters</Text>
            <TouchableOpacity 
              onPress={() => setActiveFilters({ length: 'Medium', intensity: 'Medium', tone: 'Neutral' })}
              style={styles.resetButton}
            >
              <Text style={[styles.resetText, { color: collection.accentColor }]}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 140,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginLeft: -4,
  },
  backText: {
    color: COLORS.silver,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 12,
  },
  promiseText: {
    color: COLORS.silver,
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 40,
  },
  filtersSection: {
    marginBottom: 40,
    gap: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    color: COLORS.silver,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    width: 80,
  },
  filterScroll: {
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(167, 171, 180, 0.2)',
    marginRight: 8,
  },
  filterText: {
    color: COLORS.silver,
    fontSize: 13,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  loaderContainer: {
    marginTop: 60,
    alignItems: 'center',
    gap: 16,
  },
  loaderText: {
    color: COLORS.silver,
    fontSize: 14,
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    color: COLORS.silver,
    fontSize: 16,
    textAlign: 'center',
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(167, 171, 180, 0.1)',
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
