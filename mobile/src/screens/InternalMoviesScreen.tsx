import React, { useState, useEffect } from 'react';
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
    const { user } = useSession();
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [viewSize, setViewSize] = useState<'compact' | 'standard' | 'large'>('standard');
    const [activeDropdown, setActiveDropdown] = useState<'genre' | 'year' | null>(null);

    useEffect(() => {
        fetchMovies();
    }, []);

    const fetchMovies = async () => {
        try {
            const data = await apiClient.getInternalMovies();
            setMovies(data.movies || []);
        } catch (error) {
            console.error(error);
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
                        cloudfrontUrl: videoUrl
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
        return true;
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
                        if (viewSize === 'standard') setViewSize('compact');
                        else if (viewSize === 'compact') setViewSize('large');
                        else setViewSize('standard');
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

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.gold.mid} />
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
            </TouchableOpacity>

            {filterOpen && (
                <View style={[styles.filterPanel, { bottom: insets.bottom + 90 }]}>
                    <TouchableOpacity
                        style={styles.filterRow}
                        onPress={() => setActiveDropdown(activeDropdown === 'genre' ? null : 'genre')}
                    >
                        <Text style={styles.filterLabel}>Genre</Text>
                        <View style={styles.filterValueRow}>
                            <Text style={styles.filterValue}>{selectedGenre || 'All'}</Text>
                            <Ionicons name={activeDropdown === 'genre' ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.silver} />
                        </View>
                    </TouchableOpacity>
                    {activeDropdown === 'genre' && (
                        <ScrollView style={styles.dropdownList}>
                            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setSelectedGenre(null); setActiveDropdown(null); }}>
                                <Text style={styles.dropdownText}>All</Text>
                            </TouchableOpacity>
                            {genres.map((genre) => (
                                <TouchableOpacity key={genre} style={styles.dropdownItem} onPress={() => { setSelectedGenre(genre); setActiveDropdown(null); }}>
                                    <Text style={styles.dropdownText}>{genre}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                    <TouchableOpacity
                        style={styles.filterRow}
                        onPress={() => setActiveDropdown(activeDropdown === 'year' ? null : 'year')}
                    >
                        <Text style={styles.filterLabel}>Year</Text>
                        <View style={styles.filterValueRow}>
                            <Text style={styles.filterValue}>{selectedYear || 'All'}</Text>
                            <Ionicons name={activeDropdown === 'year' ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.silver} />
                        </View>
                    </TouchableOpacity>
                    {activeDropdown === 'year' && (
                        <ScrollView style={styles.dropdownList}>
                            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setSelectedYear(null); setActiveDropdown(null); }}>
                                <Text style={styles.dropdownText}>All</Text>
                            </TouchableOpacity>
                            {years.map((year) => (
                                <TouchableOpacity key={year} style={styles.dropdownItem} onPress={() => { setSelectedYear(year); setActiveDropdown(null); }}>
                                    <Text style={styles.dropdownText}>{year}</Text>
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
});
