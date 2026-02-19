import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme/tokens';
import { apiClient } from '../lib/api';
import { TitleTile } from '../components/index';
import { transformToCloudFront } from '../lib/utils';
import { RefreshControl } from 'react-native';

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
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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
                        permanence: 'Permanent Core',
                        playable: true
                    } as any}
                    width={(width - SPACING.xl * 2 - SPACING.md) / 2}
                    onPress={() => {
                        if (item.tmdbId) {
                            navigation.navigate('TitleDetail', {
                                id: item.tmdbId.toString(),
                                movie: {
                                    id: item.tmdbId.toString(),
                                    title: item.title,
                                    poster: posterUrl,
                                    playable: true,
                                    assetId: item.id,
                                    cloudfrontUrl: videoUrl,
                                    year: movieYear,
                                    runtime: movieDuration,
                                    permanence: 'Permanent Core'
                                }
                            });
                        } else {
                            navigation.navigate('Watch', {
                                videoUrl: videoUrl,
                                title: item.title
                            });
                        }
                    }}
                />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Hosted Movies</Text>
                <View style={{ width: 28 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.gold.mid} />
                </View>
            ) : movies.length > 0 ? (
                <FlatList
                    data={movies}
                    renderItem={renderItem}
                    keyExtractor={(item: Movie) => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.columnWrapper}
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
});
