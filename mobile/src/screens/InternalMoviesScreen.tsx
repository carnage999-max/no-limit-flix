import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme/tokens';
import { apiClient } from '../lib/api';
import { TitleTile } from '../components/index';
import { transformToCloudFront } from '../lib/utils';
import { RefreshControl } from 'react-native';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWatchProgress } from '../hooks/useWatchProgress';

const { width } = Dimensions.get('window');

interface Movie {
    id: string;
    tmdbId?: number;
    title: string;
    thumbnailUrl: string;
    releaseYear: number;
    duration?: number;
    genre?: string;
    s3Url: string;
}

export const InternalMoviesScreen = () => {
    const navigation = useNavigation<any>();
    const { user, loading: sessionLoading } = useSession();
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();
    const { progressMap, statusMap, lastWatchedMap } = useWatchProgress();
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [watchFilter, setWatchFilter] = useState<'all' | 'watching' | 'watched' | 'unwatched'>('all');
    const [sortBy, setSortBy] = useState<'recent' | 'title' | 'year' | 'progress'>('recent');
    const [viewSize, setViewSize] = useState<'compact' | 'standard' | 'large'>('standard');
    const [activeDropdown, setActiveDropdown] = useState<'genre' | 'year' | 'status' | 'sort' | null>(null);

    const hasActiveFilters = selectedGenre !== null || selectedYear !== null || watchFilter !== 'all' || sortBy !== 'recent';

    useEffect(() => {
        AsyncStorage.multiGet([
            'internalMovies_viewSize',
            'internalMovies_genre',
            'internalMovies_year',
            'internalMovies_watchFilter',
            'internalMovies_sortBy',
        ]).then(pairs => {
            const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
            const vs = map['internalMovies_viewSize'];
            if (vs === 'compact' || vs === 'standard' || vs === 'large') setViewSize(vs);
            const genre = map['internalMovies_genre'];
            if (genre) setSelectedGenre(genre);
            const year = map['internalMovies_year'];
            if (year) setSelectedYear(Number(year));
            const wf = map['internalMovies_watchFilter'];
            if (wf === 'all' || wf === 'watching' || wf === 'watched' || wf === 'unwatched') setWatchFilter(wf);
            const sb = map['internalMovies_sortBy'];
            if (sb === 'recent' || sb === 'title' || sb === 'year' || sb === 'progress') setSortBy(sb);
        });
    }, []);

    const updateViewSize = useCallback((size: 'compact' | 'standard' | 'large') => {
        setViewSize(size);
        AsyncStorage.setItem('internalMovies_viewSize', size);
    }, []);

    const updateGenre = useCallback((genre: string | null) => {
        setSelectedGenre(genre);
        if (genre) AsyncStorage.setItem('internalMovies_genre', genre);
        else AsyncStorage.removeItem('internalMovies_genre');
    }, []);

    const updateYear = useCallback((year: number | null) => {
        setSelectedYear(year);
        if (year) AsyncStorage.setItem('internalMovies_year', String(year));
        else AsyncStorage.removeItem('internalMovies_year');
    }, []);

    const updateWatchFilter = useCallback((wf: 'all' | 'watching' | 'watched' | 'unwatched') => {
        setWatchFilter(wf);
        AsyncStorage.setItem('internalMovies_watchFilter', wf);
    }, []);

    const updateSortBy = useCallback((sb: 'recent' | 'title' | 'year' | 'progress') => {
        setSortBy(sb);
        AsyncStorage.setItem('internalMovies_sortBy', sb);
    }, []);

    const clearAllFilters = useCallback(() => {
        setSelectedGenre(null);
        setSelectedYear(null);
        setWatchFilter('all');
        setSortBy('recent');
        setActiveDropdown(null);
        AsyncStorage.multiRemove([
            'internalMovies_genre',
            'internalMovies_year',
            'internalMovies_watchFilter',
            'internalMovies_sortBy',
        ]);
    }, []);

    useEffect(() => {
        if (sessionLoading) {
            setLoading(true);
            return;
        }
        if (!user) {
            setLoading(false);
            setMovies([]);
            setFetchError(null);
            return;
        }
        fetchMovies();
    }, [sessionLoading, user]);

    const fetchMovies = async () => {
        if (!user) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            setFetchError(null);
            const data = await apiClient.getInternalMovies();
            setMovies(data.movies || []);
        } catch (error) {
            console.error(error);
            setFetchError('Unable to load hosted movies. Check your connection and retry.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchMovies();
    };

    const getTileWidth = () => {
        const horizontalPadding = SPACING.xl * 2;
        const availableWidth = width - horizontalPadding;
        if (viewSize === 'compact') return (availableWidth - (SPACING.sm * 2)) / 3;
        if (viewSize === 'standard') return (availableWidth - SPACING.sm) / 2;
        return availableWidth;
    };

    const renderItem = ({ item }: { item: Movie }) => {
        const movieYear = item.releaseYear || 2024;
        const movieDuration = item.duration ? Math.floor(item.duration / 60) : 0;
        const posterUrl = transformToCloudFront(item.thumbnailUrl) || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400';
        const videoUrl = transformToCloudFront(item.s3Url);
        const progress = progressMap[item.id] ?? (item.tmdbId ? progressMap[String(item.tmdbId)] : undefined);

        return (
            <View style={styles.itemContainer}>
                <TitleTile
                    movie={{
                        id: item.tmdbId ? item.tmdbId.toString() : item.id,
                        title: item.title,
                        poster: posterUrl,
                        year: movieYear,
                        runtime: movieDuration,
                        genres: item.genre ? [item.genre] : ['Featured'],
                        playable: true,
                        assetId: item.id,
                        cloudfrontUrl: videoUrl,
                        progress,
                    } as any}
                    width={getTileWidth()}
                    onPress={() => {
                        if (!user) {
                            showToast({ message: 'Sign in to watch.', type: 'info' });
                            navigation.navigate('Auth', { tab: 'login' });
                            return;
                        }
                        const detailId = item.tmdbId ? item.tmdbId.toString() : item.id;
                        navigation.navigate('TitleDetail', {
                            id: detailId,
                            movie: {
                                id: detailId,
                                title: item.title,
                                poster: posterUrl,
                                playable: true,
                                assetId: item.id,
                                cloudfrontUrl: videoUrl,
                                year: movieYear,
                                runtime: movieDuration,
                                genres: item.genre ? [item.genre] : ['Featured'],
                                progress,
                            }
                        });
                    }}
                />
            </View>
        );
    };

    const genres = Array.from(
        new Set(
            movies
                .flatMap(movie => (movie.genre || '').split(','))
                .map(g => g.trim())
                .filter(Boolean)
        )
    );

    const years = Array.from(new Set(movies.map(movie => movie.releaseYear).filter(Boolean))) as number[];
    years.sort((a, b) => b - a);

    const filteredMovies = movies.filter(movie => {
        if (selectedGenre && !(movie.genre || '').includes(selectedGenre)) return false;
        if (selectedYear && movie.releaseYear !== selectedYear) return false;
        const statusKey = statusMap[movie.id] || (movie.tmdbId ? statusMap[String(movie.tmdbId)] : undefined);
        if (watchFilter === 'watching' && statusKey !== 'watching') return false;
        if (watchFilter === 'watched' && statusKey !== 'completed') return false;
        if (watchFilter === 'unwatched' && statusKey) return false;
        return true;
    }).sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'year') return (b.releaseYear || 0) - (a.releaseYear || 0);
        if (sortBy === 'progress') {
            const aProgress = progressMap[a.id] ?? (a.tmdbId ? progressMap[String(a.tmdbId)] : 0) ?? 0;
            const bProgress = progressMap[b.id] ?? (b.tmdbId ? progressMap[String(b.tmdbId)] : 0) ?? 0;
            return bProgress - aProgress;
        }
        const aWatched = lastWatchedMap[a.id] ?? (a.tmdbId ? lastWatchedMap[String(a.tmdbId)] : 0) ?? 0;
        const bWatched = lastWatchedMap[b.id] ?? (b.tmdbId ? lastWatchedMap[String(b.tmdbId)] : 0) ?? 0;
        return bWatched - aWatched;
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Hosted Movies</Text>
                <TouchableOpacity
                    onPress={() => {
                        if (viewSize === 'standard') updateViewSize('compact');
                        else if (viewSize === 'compact') updateViewSize('large');
                        else updateViewSize('standard');
                    }}
                    style={styles.viewToggle}
                >
                    <Ionicons
                        name={viewSize === 'compact' ? 'grid-outline' : viewSize === 'standard' ? 'apps-outline' : 'list-outline'}
                        size={18}
                        color={COLORS.gold.mid}
                    />
                    <Text style={styles.viewToggleText}>{viewSize.toUpperCase()}</Text>
                </TouchableOpacity>
            </View>

            {sessionLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.gold.mid} />
                    <Text style={styles.helperText}>Checking account access…</Text>
                </View>
            ) : !user ? (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>Sign in to browse hosted movies.</Text>
                    <TouchableOpacity
                        style={styles.stateAction}
                        onPress={() => navigation.navigate('Auth', { tab: 'login' })}
                    >
                        <Text style={styles.stateActionText}>Sign in</Text>
                    </TouchableOpacity>
                </View>
            ) : loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.gold.mid} />
                </View>
            ) : fetchError ? (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>{fetchError}</Text>
                    <TouchableOpacity onPress={fetchMovies} style={styles.stateAction}>
                        <Text style={styles.stateActionText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : movies.length > 0 ? (
                <FlatList
                    data={filteredMovies}
                    renderItem={renderItem}
                    keyExtractor={(item: Movie) => item.id}
                    numColumns={viewSize === 'large' ? 1 : viewSize === 'standard' ? 2 : 3}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 140 }]}
                    columnWrapperStyle={viewSize === 'large' ? undefined : styles.columnWrapper}
                    key={viewSize}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={COLORS.gold.mid}
                            colors={[COLORS.gold.mid]}
                        />
                    }
                />
            ) : (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>No hosted movies found.</Text>
                    <TouchableOpacity onPress={onRefresh} style={{ marginTop: 20 }}>
                        <Text style={{ color: COLORS.gold.mid }}>Refresh</Text>
                    </TouchableOpacity>
                </View>
            )}

            <TouchableOpacity style={[styles.floatingButton, { bottom: insets.bottom + 24 }]} onPress={() => setFilterOpen(!filterOpen)}>
                <Ionicons name="options-outline" size={22} color={COLORS.background} />
                {hasActiveFilters && <View style={styles.filterDot} />}
            </TouchableOpacity>

            {filterOpen && (
                <View style={[styles.filterPanel, { bottom: insets.bottom + 90 }]}>
                    <View style={styles.filterPanelHeader}>
                        <Text style={styles.filterPanelTitle}>Filters</Text>
                        {hasActiveFilters && (
                            <TouchableOpacity onPress={clearAllFilters} style={styles.clearAllBtn}>
                                <Ionicons name="close-circle-outline" size={14} color="#ff4444" />
                                <Text style={styles.clearAllText}>Clear all</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.filterRow}
                        onPress={() => setActiveDropdown(activeDropdown === 'genre' ? null : 'genre')}
                    >
                        <Text style={[styles.filterLabel, selectedGenre && styles.filterLabelActive]}>Genre</Text>
                        <View style={styles.filterValueRow}>
                            <Text style={[styles.filterValue, selectedGenre && styles.filterValueActive]}>{selectedGenre || 'All'}</Text>
                            <Ionicons name={activeDropdown === 'genre' ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.silver} />
                        </View>
                    </TouchableOpacity>
                    {activeDropdown === 'genre' && (
                        <ScrollView style={styles.dropdownList}>
                            <TouchableOpacity style={styles.dropdownItem} onPress={() => { updateGenre(null); setActiveDropdown(null); }}>
                                <Text style={styles.dropdownText}>All</Text>
                            </TouchableOpacity>
                            {genres.map((genre) => (
                                <TouchableOpacity key={genre} style={styles.dropdownItem} onPress={() => { updateGenre(genre); setActiveDropdown(null); }}>
                                    <Text style={[styles.dropdownText, selectedGenre === genre && styles.dropdownTextActive]}>{genre}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                    <TouchableOpacity
                        style={styles.filterRow}
                        onPress={() => setActiveDropdown(activeDropdown === 'year' ? null : 'year')}
                    >
                        <Text style={[styles.filterLabel, selectedYear && styles.filterLabelActive]}>Year</Text>
                        <View style={styles.filterValueRow}>
                            <Text style={[styles.filterValue, selectedYear && styles.filterValueActive]}>{selectedYear || 'All'}</Text>
                            <Ionicons name={activeDropdown === 'year' ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.silver} />
                        </View>
                    </TouchableOpacity>
                    {activeDropdown === 'year' && (
                        <ScrollView style={styles.dropdownList}>
                            <TouchableOpacity style={styles.dropdownItem} onPress={() => { updateYear(null); setActiveDropdown(null); }}>
                                <Text style={styles.dropdownText}>All</Text>
                            </TouchableOpacity>
                            {years.map((year) => (
                                <TouchableOpacity key={year} style={styles.dropdownItem} onPress={() => { updateYear(year); setActiveDropdown(null); }}>
                                    <Text style={[styles.dropdownText, selectedYear === year && styles.dropdownTextActive]}>{year}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                    <TouchableOpacity
                        style={styles.filterRow}
                        onPress={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                    >
                        <Text style={[styles.filterLabel, watchFilter !== 'all' && styles.filterLabelActive]}>Watch status</Text>
                        <View style={styles.filterValueRow}>
                            <Text style={[styles.filterValue, watchFilter !== 'all' && styles.filterValueActive]}>
                                {watchFilter === 'all' ? 'All' : watchFilter === 'watching' ? 'Watching' : watchFilter === 'watched' ? 'Watched' : 'Unwatched'}
                            </Text>
                            <Ionicons name={activeDropdown === 'status' ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.silver} />
                        </View>
                    </TouchableOpacity>
                    {activeDropdown === 'status' && (
                        <ScrollView style={styles.dropdownList}>
                            {[
                                { label: 'All', value: 'all' },
                                { label: 'Watching', value: 'watching' },
                                { label: 'Watched', value: 'watched' },
                                { label: 'Unwatched', value: 'unwatched' },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={styles.dropdownItem}
                                    onPress={() => { updateWatchFilter(option.value as any); setActiveDropdown(null); }}
                                >
                                    <Text style={[styles.dropdownText, watchFilter === option.value && styles.dropdownTextActive]}>{option.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                    <TouchableOpacity
                        style={styles.filterRow}
                        onPress={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
                    >
                        <Text style={[styles.filterLabel, sortBy !== 'recent' && styles.filterLabelActive]}>Sort by</Text>
                        <View style={styles.filterValueRow}>
                            <Text style={[styles.filterValue, sortBy !== 'recent' && styles.filterValueActive]}>
                                {sortBy === 'recent' ? 'Recently watched' : sortBy === 'title' ? 'Title' : sortBy === 'year' ? 'Year' : 'Progress'}
                            </Text>
                            <Ionicons name={activeDropdown === 'sort' ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.silver} />
                        </View>
                    </TouchableOpacity>
                    {activeDropdown === 'sort' && (
                        <ScrollView style={styles.dropdownList}>
                            {[
                                { label: 'Recently watched', value: 'recent' },
                                { label: 'Title', value: 'title' },
                                { label: 'Year', value: 'year' },
                                { label: 'Progress', value: 'progress' },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={styles.dropdownItem}
                                    onPress={() => { updateSortBy(option.value as any); setActiveDropdown(null); }}
                                >
                                    <Text style={[styles.dropdownText, sortBy === option.value && styles.dropdownTextActive]}>{option.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    viewToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.4)',
    },
    viewToggleText: {
        color: COLORS.gold.mid,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    title: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: '700',
    },
    listContent: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: 40,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    itemContainer: {
        marginBottom: SPACING.md,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.silver,
        fontSize: 16,
        textAlign: 'center',
        marginHorizontal: 24,
    },
    helperText: {
        color: COLORS.silver,
        fontSize: 13,
        marginTop: 10,
    },
    stateAction: {
        marginTop: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.gold.mid,
    },
    stateActionText: {
        color: COLORS.gold.mid,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    floatingButton: {
        position: 'absolute',
        right: 24,
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.gold.mid,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.gold.mid,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    filterDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: '#ff4444',
        borderWidth: 1.5,
        borderColor: COLORS.gold.mid,
    },
    filterPanel: {
        position: 'absolute',
        right: 24,
        width: 220,
        backgroundColor: 'rgba(11, 11, 13, 0.98)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingVertical: 10,
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    filterPanelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    filterPanelTitle: {
        color: COLORS.text,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    clearAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,68,68,0.4)',
    },
    clearAllText: {
        color: '#ff4444',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    filterRow: {
        paddingVertical: 8,
    },
    filterLabel: {
        color: COLORS.silver,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 6,
    },
    filterLabelActive: {
        color: COLORS.gold.mid,
    },
    filterValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    filterValue: {
        color: COLORS.text,
        fontSize: 13,
        fontWeight: '600',
    },
    filterValueActive: {
        color: COLORS.gold.mid,
    },
    dropdownList: {
        maxHeight: 160,
        marginBottom: 6,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    dropdownItem: {
        paddingVertical: 8,
    },
    dropdownText: {
        color: COLORS.silver,
        fontSize: 13,
    },
    dropdownTextActive: {
        color: COLORS.gold.mid,
        fontWeight: '700',
    },
});
