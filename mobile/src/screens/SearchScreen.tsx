import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme/tokens';
import { apiClient } from '../lib/api';
import { transformToCloudFront } from '../lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SearchResult {
  id: string;
  title: string;
  year: number;
}

export const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [internalResults, setInternalResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const RECENT_KEY = '@nolimitflix_recent_searches';

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setInternalResults([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [internalData, catalogData] = await Promise.all([
        apiClient.searchInternalLibrary(searchQuery, 12),
        apiClient.searchMovies(searchQuery),
      ]);
      setInternalResults(internalData?.results || []);
      setResults(catalogData || []);
      const cleaned = searchQuery.trim();
      if (cleaned.length >= 2) {
        const next = [cleaned, ...recentSearches.filter((item) => item.toLowerCase() !== cleaned.toLowerCase())].slice(0, 8);
        setRecentSearches(next);
        await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setInternalResults([]);
    } finally {
      setLoading(false);
    }
  }, [recentSearches]);

  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Set new timeout for debounced search
    if (query.length >= 2) {
      const timeout = setTimeout(() => {
        performSearch(query);
      }, 400); // 400ms debounce
      setDebounceTimeout(timeout);
    } else {
      setResults([]);
      setLoading(false);
    }

    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [query]);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentSearches(parsed);
          }
        }
      } catch {
        setRecentSearches([]);
      }
    };
    loadRecent();
  }, []);

  const handleSelectMovie = (movieId: string) => {
    Keyboard.dismiss();
    navigation.navigate('TitleDetail', { id: movieId });
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectMovie(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.resultYear}>{item.year}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.silver} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (loading) return null;
    
    if (query.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color={COLORS.silver} style={{ opacity: 0.3 }} />
          <Text style={styles.emptyTitle}>Search for Movies</Text>
          <Text style={styles.emptySubtitle}>
            Start typing to find your next favorite film
          </Text>
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>Recent searches</Text>
                <TouchableOpacity
                  onPress={async () => {
                    setRecentSearches([]);
                    await AsyncStorage.removeItem(RECENT_KEY);
                  }}
                >
                  <Text style={styles.recentClear}>Clear</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.recentChips}>
                {recentSearches.map((item) => (
                  <TouchableOpacity
                    key={`recent-${item}`}
                    style={styles.recentChip}
                    onPress={() => setQuery(item)}
                  >
                    <Text style={styles.recentChipText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      );
    }

    if (query.length < 2) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptySubtitle}>Type at least 2 characters to search</Text>
        </View>
      );
    }

    if (results.length === 0 && internalResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="film-outline" size={64} color={COLORS.silver} style={{ opacity: 0.3 }} />
          <Text style={styles.emptyTitle}>Couldn't find anything</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.silver} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies..."
            placeholderTextColor={COLORS.silver}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={COLORS.silver} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.gold.mid} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.resultsList}
        keyboardShouldPersistTaps="handled"
      >
        {renderEmptyState()}
        {!!internalResults.length && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ready to watch now</Text>
            {internalResults.map((item: any) => {
              const posterUrl = transformToCloudFront(item.thumbnailUrl) || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400';
              const videoUrl = transformToCloudFront(item.s3Url);
              const genres = (item.genre || '')
                .split(',')
                .map((genre: string) => genre.trim())
                .filter(Boolean);
              const detailId = item.tmdbId ? item.tmdbId.toString() : item.id;
              return (
                <TouchableOpacity
                  key={`internal-${detailId}`}
                  style={styles.resultItem}
                  onPress={() =>
                    navigation.navigate('TitleDetail', {
                      id: detailId,
                      movie: {
                        id: detailId,
                        title: item.title,
                        poster: posterUrl,
                        playable: true,
                        assetId: item.id,
                        cloudfrontUrl: videoUrl,
                        year: item.releaseYear,
                        runtime: Math.floor((item.duration || 0) / 60),
                        genres,
                      },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.resultContent}>
                    <Image source={{ uri: posterUrl }} style={styles.resultPoster} />
                    <View style={styles.resultText}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.resultYear}>{item.releaseYear || '—'}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.silver} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!!results.length && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Explore the catalog</Text>
            {results.map((item) => (
              <View key={`catalog-${item.id}`}>
                {renderSearchResult({ item })}
              </View>
            ))}
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
  searchHeader: {
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167, 171, 180, 0.1)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167, 171, 180, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167, 171, 180, 0.2)',
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    color: COLORS.silver,
    fontSize: 14,
  },
  resultsList: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 140,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold.mid,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 12,
    marginBottom: 10,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167, 171, 180, 0.1)',
  },
  resultContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultPoster: {
    width: 46,
    height: 68,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  resultText: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  resultYear: {
    color: COLORS.silver,
    fontSize: 14,
    fontWeight: '400',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS.silver,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  recentSection: {
    marginTop: 24,
    width: '100%',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    color: COLORS.gold.mid,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  recentClear: {
    color: COLORS.silver,
    fontSize: 12,
    fontWeight: '600',
  },
  recentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    borderWidth: 1,
    borderColor: 'rgba(167, 171, 180, 0.2)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(167, 171, 180, 0.08)',
  },
  recentChipText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
});
