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
        }
    };

    const renderItem = ({ item }: { item: Movie }) => (
        <View style={styles.itemContainer}>
            <TitleTile
                movie={{
                    id: item.tmdbId || item.id, // Prefer TMDb ID for details if available
                    title: item.title,
                    poster: item.thumbnailUrl,
                    year: item.releaseYear,
                    runtime: item.duration ? Math.round(item.duration / 60) : 0,
                    genres: item.genre ? [item.genre] : [],
                } as any}
                width={(width - SPACING.xl * 2 - SPACING.md) / 2}
                onPress={() => {
                    // If we have a TMDb ID, go to Detail Screen which will now have a Play button
                    if (item.tmdbId) {
                        navigation.navigate('TitleDetail', {
                            id: item.tmdbId,
                            movie: {
                                id: item.tmdbId,
                                title: item.title,
                                poster: item.thumbnailUrl,
                                playable: true,
                                assetId: item.id,
                                cloudfrontUrl: item.s3Url
                            }
                        });
                    } else {
                        // Direct playback if no TMDb record
                        navigation.navigate('Watch', { videoUrl: item.s3Url, title: item.title });
                    }
                }}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Hosted Movies</Text>
                <View style={{ width: 28 }} />
            </View>

            {loading ? (
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
                />
            ) : (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>No hosted movies found.</Text>
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
