import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    Dimensions,
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme/tokens';
import { apiClient } from '../lib/api';
import { transformToCloudFront } from '../lib/utils';
import { RefreshControl } from 'react-native';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { TitleTile } from '../components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export const InternalTvScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useSession();
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();
    const [series, setSeries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedSeries, setSelectedSeries] = useState<any | null>(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [viewSize, setViewSize] = useState<'compact' | 'standard' | 'large'>('standard');
    const [activeDropdown, setActiveDropdown] = useState<'genre' | 'year' | null>(null);

    useEffect(() => {
        fetchTvLibrary();
    }, []);

    const fetchTvLibrary = async () => {
        try {
            const data = await apiClient.getInternalTv();
            setSeries(data.series || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchTvLibrary();
    };

    const getTileWidth = () => {
        const horizontalPadding = SPACING.xl * 2;
        const availableWidth = width - horizontalPadding;
        if (viewSize === 'compact') return (availableWidth - (SPACING.sm * 2)) / 3;
        if (viewSize === 'standard') return (availableWidth - SPACING.sm) / 2;
        return availableWidth;
    };

    const renderSeriesItem = ({ item }: { item: any }) => {
        const posterUrl = transformToCloudFront(item.thumbnailUrl) || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400';
        return (
            <View style={styles.itemContainer}>
                <TitleTile
                    movie={{
                        id: item.seriesTitle || item.id,
                        title: item.seriesTitle || 'Series',
                        poster: posterUrl,
                        year: item.releaseYear || 0,
                        runtime: 0,
                        genres: item.genre ? [item.genre] : ['Series'],
                        playable: false,
                    } as any}
                    width={getTileWidth()}
                    onPress={() => setSelectedSeries(item)}
                />
            </View>
        );
    };

    const genres = Array.from(
        new Set(
            series
                .flatMap(item => (item.genre || '').split(','))
                .map((g: string) => g.trim())
                .filter(Boolean)
        )
    );
    const years = Array.from(new Set(series.map(item => item.releaseYear).filter(Boolean))) as number[];
    years.sort((a, b) => b - a);

    const filteredSeries = series.filter(item => {
        if (selectedGenre && !(item.genre || '').includes(selectedGenre)) return false;
        if (selectedYear && item.releaseYear !== selectedYear) return false;
        return true;
    });

    const renderEpisodeItem = ({ item }: { item: any }) => {
        const seriesName = selectedSeries?.seriesTitle || item.seriesTitle || 'Series';
        const videoUrl = transformToCloudFront(item.s3Url);
        const durationMins = item.duration ? Math.floor(item.duration / 60) : 0;
        const year = item.releaseYear || 2024;

        return (
            <TouchableOpacity
                style={styles.episodeCard}
                onPress={() => {
                    if (!user) {
                        showToast({ message: 'Sign in to watch.', type: 'info' });
                        navigation.navigate('Auth', { tab: 'login' });
                        return;
                    }
                    navigation.navigate('Watch', {
                        videoUrl: videoUrl,
                        title: `${seriesName} - S${item.seasonNumber}E${item.episodeNumber}: ${item.title}`,
                        assetId: item.id
                    });
                }}
            >
                <View style={styles.episodeNumberContainer}>
                    <Text style={styles.episodeNumber}>E{item.episodeNumber}</Text>
                </View>
                <View style={styles.episodeInfo}>
                    <Text style={styles.episodeTitle}>{item.title}</Text>
                    <Text style={styles.episodeMeta}>
                        S{item.seasonNumber} • {year} {durationMins > 0 ? `• ${durationMins}m` : ''}
                    </Text>
                </View>
                <Ionicons name="play-circle" size={32} color={COLORS.gold.mid} />
            </TouchableOpacity>
        );
    };

    if (selectedSeries) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setSelectedSeries(null)}>
                        <Ionicons name="chevron-back" size={28} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.title} numberOfLines={1}>{selectedSeries.seriesTitle || 'TV Series'}</Text>
                    <View style={{ width: 28 }} />
                </View>

                <FlatList
                    data={selectedSeries.episodes}
                    renderItem={renderEpisodeItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.episodeList}
                    ListHeaderComponent={() => (
                        <View style={styles.seriesHeader}>
                            <Image source={{ uri: selectedSeries.thumbnailUrl || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400' }} style={styles.headerPoster} />
                            <Text style={styles.headerDescription}>Available Episodes</Text>
                        </View>
                    )}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={28} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>TV Library</Text>
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
            ) : series.length > 0 ? (
                <FlatList
                    data={filteredSeries}
                    renderItem={renderSeriesItem}
                    keyExtractor={(item) => item.seriesTitle || item.id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 140 }]}
                    numColumns={viewSize === 'large' ? 1 : viewSize === 'standard' ? 2 : 3}
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
                    <Text style={styles.emptyText}>No hosted series found.</Text>
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
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
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
        flex: 1,
        textAlign: 'center',
        marginRight: 28, // Offset for back button to center exactly
    },
    listContent: {
        padding: 20,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    itemContainer: {
        marginBottom: SPACING.md,
    },
    seriesCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    seriesPoster: {
        width: 60,
        height: 90,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    seriesInfo: {
        flex: 1,
        marginLeft: 16,
    },
    seriesTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    seriesMeta: {
        color: COLORS.silver,
        fontSize: 14,
    },
    episodeList: {
        paddingBottom: 40,
    },
    seriesHeader: {
        alignItems: 'center',
        padding: 20,
        marginBottom: 20,
    },
    headerPoster: {
        width: 140,
        height: 210,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    headerDescription: {
        color: COLORS.gold.mid,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    episodeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    episodeNumberContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    episodeNumber: {
        color: COLORS.gold.mid,
        fontWeight: '700',
        fontSize: 14,
    },
    episodeInfo: {
        flex: 1,
    },
    episodeTitle: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    episodeMeta: {
        color: COLORS.silver,
        fontSize: 13,
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
