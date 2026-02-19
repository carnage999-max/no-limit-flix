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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme/tokens';
import { apiClient } from '../lib/api';

const { width } = Dimensions.get('window');

export const InternalTvScreen = () => {
    const navigation = useNavigation<any>();
    const [series, setSeries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeries, setSelectedSeries] = useState<any | null>(null);

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
        }
    };

    const renderSeriesItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.seriesCard}
            onPress={() => setSelectedSeries(item)}
        >
            <Image source={{ uri: item.thumbnailUrl }} style={styles.seriesPoster} />
            <View style={styles.seriesInfo}>
                <Text style={styles.seriesTitle}>{item.seriesTitle}</Text>
                <Text style={styles.seriesMeta}>{item.genre} • {item.episodeCount} Episodes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.silver} />
        </TouchableOpacity>
    );

    const renderEpisodeItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.episodeCard}
            onPress={() => navigation.navigate('Watch', {
                videoUrl: item.s3Url,
                title: `${item.seriesTitle} - S${item.seasonNumber}E${item.episodeNumber}: ${item.title}`
            })}
        >
            <View style={styles.episodeNumberContainer}>
                <Text style={styles.episodeNumber}>E{item.episodeNumber}</Text>
            </View>
            <View style={styles.episodeInfo}>
                <Text style={styles.episodeTitle}>{item.title}</Text>
                <Text style={styles.episodeMeta}>Season {item.seasonNumber}</Text>
            </View>
            <Ionicons name="play-circle" size={32} color={COLORS.gold.mid} />
        </TouchableOpacity>
    );

    if (selectedSeries) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setSelectedSeries(null)}>
                        <Ionicons name="chevron-back" size={28} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.title} numberOfLines={1}>{selectedSeries.seriesTitle}</Text>
                    <View style={{ width: 28 }} />
                </View>

                <FlatList
                    data={selectedSeries.episodes}
                    renderItem={renderEpisodeItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.episodeList}
                    ListHeaderComponent={() => (
                        <View style={styles.seriesHeader}>
                            <Image source={{ uri: selectedSeries.thumbnailUrl }} style={styles.headerPoster} />
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
                <View style={{ width: 28 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.gold.mid} />
                </View>
            ) : series.length > 0 ? (
                <FlatList
                    data={series}
                    renderItem={renderSeriesItem}
                    keyExtractor={(item) => item.seriesTitle}
                    contentContainerStyle={styles.listContent}
                />
            ) : (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>No hosted series found.</Text>
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
    title: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
    },
    listContent: {
        padding: 20,
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
});
