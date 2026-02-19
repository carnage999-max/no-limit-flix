import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../theme/tokens';
import { COLLECTIONS } from '../lib/constants';
import { useFavorites } from '../context/FavoritesContext';
import { TitleTile } from '../components/index';

export const LibraryScreen = () => {
  const navigation = useNavigation<any>();
  const { favorites } = useFavorites();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Your Library</Text>
        <Text style={styles.subtitle}>
          Explore curated collections that never rotate
        </Text>

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Favorites</Text>
              <Text style={styles.sectionCount}>{favorites.length} {favorites.length === 1 ? 'film' : 'films'}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.favoritesScroll}
            >
              {favorites.map((movie) => (
                <View key={movie.id} style={styles.favoriteItem}>
                  <TitleTile
                    movie={movie}
                    onPress={(movieId: string) => navigation.navigate('TitleDetail', { id: movieId, movie })}
                    width={140}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {favorites.length === 0 && (
          <View style={styles.emptyFavorites}>
            <Ionicons name="heart-outline" size={64} color={COLORS.silver} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the heart icon on any movie to add it to your favorites
            </Text>
          </View>
        )}

        {/* Available to Watch — Internal Library Entry */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available to Watch</Text>
          <View style={styles.libraryGateGrid}>
            <TouchableOpacity
              style={styles.libraryCard}
              onPress={() => navigation.navigate('InternalMovies')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']}
                style={styles.cardGradient}
              >
                <Ionicons name="film" size={32} color={COLORS.gold.mid} style={styles.cardIcon} />
                <Text style={styles.cardLabel}>Movies</Text>
                <Text style={styles.cardCount}>Internal Library</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.libraryCard}
              onPress={() => navigation.navigate('InternalTv')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']}
                style={styles.cardGradient}
              >
                <Ionicons name="tv" size={32} color={COLORS.gold.mid} style={styles.cardIcon} />
                <Text style={styles.cardLabel}>TV Library</Text>
                <Text style={styles.cardCount}>Full Series</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Curated Collections</Text>
          <View style={styles.collectionsGrid}>
            {COLLECTIONS.map((collection) => (
              <TouchableOpacity
                key={collection.slug}
                style={[
                  styles.collectionCard,
                  { borderColor: collection.accentColor + '33' }
                ]}
                onPress={() => navigation.navigate('CollectionDetail', { id: collection.slug })}
                activeOpacity={0.7}
              >
                <View style={[styles.accentBar, { backgroundColor: collection.accentColor }]} />
                <Text style={[styles.collectionTitle, { color: collection.accentColor }]}>
                  {collection.title}
                </Text>
                <Text style={styles.collectionDescription} numberOfLines={2}>
                  {collection.description}
                </Text>
                <View style={styles.collectionFooter}>
                  <Text style={styles.collectionCount}>{collection.count} films</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.silver} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Home')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="sparkles" size={24} color={COLORS.gold.mid} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Get AI Recommendations</Text>
              <Text style={styles.actionSubtitle}>Find your perfect match</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.silver} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Search')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="search" size={24} color={COLORS.gold.mid} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Search Movies</Text>
              <Text style={styles.actionSubtitle}>Find specific titles</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.silver} />
          </TouchableOpacity>
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
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 140,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.silver,
    marginBottom: 40,
    lineHeight: 24,
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold.mid,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sectionCount: {
    fontSize: 12,
    color: COLORS.silver,
    fontWeight: '600',
  },
  favoritesScroll: {
    paddingRight: SPACING.xl,
  },
  favoriteItem: {
    marginRight: 12,
  },
  emptyFavorites: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.silver,
    textAlign: 'center',
    lineHeight: 20,
  },
  collectionsGrid: {
    gap: 16,
  },
  collectionCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(167, 171, 180, 0.03)',
    borderWidth: 1,
  },
  accentBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  collectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  collectionDescription: {
    fontSize: 14,
    color: COLORS.silver,
    lineHeight: 20,
    marginBottom: 16,
  },
  collectionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collectionCount: {
    fontSize: 12,
    color: COLORS.silver,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(167, 171, 180, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(167, 171, 180, 0.1)',
    marginBottom: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: COLORS.silver,
  },
  libraryGateGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  libraryCard: {
    flex: 1,
    height: 180,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  cardIcon: {
    marginBottom: 8,
  },
  cardLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardCount: {
    color: COLORS.gold.mid,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
