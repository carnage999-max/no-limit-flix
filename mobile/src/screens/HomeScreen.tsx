import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Dimensions,
  TextInput,
  Animated,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import {
  ButtonPrimary,
  ButtonSecondary,
  MoodChip,
  HeroCard,
  TitleTile
} from '../components/index';
import { MOOD_OPTIONS, FEEDBACK_OPTIONS } from '../lib/constants';
import { apiClient } from '../lib/api';
import { AIPickResponse, MoviePick } from '../types';
import { transformToCloudFront } from '../lib/utils';

const { height, width } = Dimensions.get('window');

export const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const isFocused = useIsFocused();
  const mainScrollRef = useRef<ScrollView>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);

  // View state: 'discovery' or 'watch'
  const [activeTab, setActiveTab] = useState<'discovery' | 'watch'>('watch');

  // Discovery State
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [vibeText, setVibeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AIPickResponse | null>(null);
  const [viewSize, setViewSize] = useState<'compact' | 'standard' | 'large'>('standard');
  const [onlyPlayable, setOnlyPlayable] = useState(false);

  // Watch Mode State
  const [hostedMovies, setHostedMovies] = useState<any[]>([]);
  const [hostedSeries, setHostedSeries] = useState<any[]>([]);
  const [isWatchLoading, setIsWatchLoading] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const bubble1Anim = useRef(new Animated.Value(0)).current;
  const bubble2Anim = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;

  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bubble1Anim, { toValue: 1, duration: 4000, useNativeDriver: true }),
          Animated.timing(bubble1Anim, { toValue: 0, duration: 4000, useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bubble2Anim, { toValue: 1, duration: 5000, useNativeDriver: true }),
          Animated.timing(bubble2Anim, { toValue: 0, duration: 5000, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  useEffect(() => {
    if (isFocused) {
      fetchHostedContent();
    }
  }, [isFocused]);

  const fetchHostedContent = async () => {
    try {
      setIsWatchLoading(true);
      const [moviesData, tvData] = await Promise.all([
        apiClient.getInternalMovies(),
        apiClient.getInternalTv()
      ]);
      setHostedMovies(moviesData.movies?.slice(0, 4) || []);
      setHostedSeries(tvData.series?.slice(0, 4) || []);
    } catch (error) {
      console.error('Failed to pre-fetch hosted content', error);
    } finally {
      setIsWatchLoading(false);
    }
  };

  const handleTabChange = (tab: 'discovery' | 'watch') => {
    setActiveTab(tab);
    horizontalScrollRef.current?.scrollTo({
      x: tab === 'watch' ? 0 : width,
      animated: true
    });
  };

  const onHorizontalScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const tab = offsetX < width / 2 ? 'watch' : 'discovery';
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  const handleMoodToggle = (moodLabel: string, selected: boolean) => {
    setSelectedMoods((prev: string[]) =>
      selected ? [...prev, moodLabel] : prev.filter((m: string) => m !== moodLabel)
    );
  };

  const handleSearch = async (overrideMoods?: string[], overrideVibe?: string) => {
    if (isLoading) return;

    // Switch to discovery tab if search is triggered from somewhere else
    if (activeTab === 'watch') {
      handleTabChange('discovery');
    }

    // Give a small delay for tab switch animation if needed, or just scroll down
    setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: height, animated: true });
    }, 100);

    setIsLoading(true);
    try {
      let response: AIPickResponse;
      const effectiveVibe = overrideVibe !== undefined ? overrideVibe : vibeText;
      const effectiveMoods = overrideMoods !== undefined ? overrideMoods : selectedMoods;

      if (effectiveVibe.trim()) {
        const interpretRes = await apiClient.interpretVibe(effectiveVibe);
        response = await apiClient.pickForMe(interpretRes.mood_tags || effectiveMoods, effectiveVibe);
      } else {
        response = await apiClient.pickForMe(effectiveMoods);
      }

      if (onlyPlayable && response) {
        const allPicks: MoviePick[] = [response.hero, ...response.alternates];
        const playables = allPicks.filter((m: MoviePick) => m.playable);
        if (playables.length > 0) {
          response.hero = playables[0];
          response.alternates = playables.slice(1);
        }
      }
      setResults(response);
    } catch (error: any) {
      console.error('Search failed:', error.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...MOOD_OPTIONS].sort(() => 0.5 - Math.random());
    const randomMoods = shuffled.slice(0, 2).map(m => m.label);
    setVibeText('');
    setSelectedMoods(randomMoods);
    handleSearch(randomMoods, '');
  };

  const handleRepick = async (feedback: string) => {
    if (!results) return;
    setIsLoading(true);
    try {
      const response = await apiClient.repick(results.sessionId, feedback);
      setResults({ ...response, sessionId: results.sessionId });
    } catch (error: any) {
      console.error('Repick failed:', error.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTileWidth = () => {
    const horizontalPadding = SPACING.md + SPACING.sm;
    const availableWidth = width - (horizontalPadding * 2);
    if (viewSize === 'compact') return (availableWidth - (SPACING.sm * 2)) / 3;
    if (viewSize === 'standard') return (availableWidth - SPACING.sm) / 2;
    return availableWidth;
  };

  const renderTabToggle = () => {
    const translateX = scrollX.interpolate({
      inputRange: [0, width],
      outputRange: [0, 126],
    });

    return (
      <View style={styles.tabToggleContainer}>
        <Animated.View
          style={[
            styles.tabSlider,
            { transform: [{ translateX }] }
          ]}
        />
        <TouchableOpacity
          onPress={() => handleTabChange('watch')}
          style={styles.tabButton}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="play-circle"
            size={18}
            color={activeTab === 'watch' ? COLORS.background : COLORS.gold.mid}
          />
          <Text style={[styles.tabButtonText, activeTab === 'watch' && styles.activeTabButtonText]}>Watch</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleTabChange('discovery')}
          style={styles.tabButton}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="auto-fix"
            size={18}
            color={activeTab === 'discovery' ? COLORS.background : COLORS.gold.mid}
          />
          <Text style={[styles.tabButtonText, activeTab === 'discovery' && styles.activeTabButtonText]}>Discovery</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderWatchMode = () => (
    <View style={styles.tabWidth}>
      <View style={styles.watchHeader}>
        <Text style={styles.watchTitle}>Premium Content</Text>
        <Text style={styles.watchSubtitle}>Hand-picked, permanent library</Text>
      </View>

      <View style={styles.hostedSummary}>
        <View style={styles.hostedHeader}>
          <Text style={styles.hostedLabel}>READY TO STREAM</Text>
          <TouchableOpacity onPress={() => navigation.navigate('InternalMovies')}>
            <Text style={styles.seeAllText}>See all movies</Text>
          </TouchableOpacity>
        </View>

        {isWatchLoading ? (
          <ActivityIndicator color={COLORS.gold.mid} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.hostedGrid}>
            {hostedMovies.map((item, index) => (
              <TouchableOpacity
                key={`movie-${item.id || index}`}
                style={styles.hostedMiniCard}
                onPress={() => {
                  const posterUrl = transformToCloudFront(item.thumbnailUrl) || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400';
                  const videoUrl = transformToCloudFront(item.s3Url);

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
                        year: item.releaseYear,
                        runtime: Math.floor((item.duration || 0) / 60),
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
              >
                <Image source={{ uri: transformToCloudFront(item.thumbnailUrl) || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400' }} style={styles.hostedMiniPoster} />
                <Text style={styles.hostedMiniTitle} numberOfLines={1}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.hostedSummary}>
        <View style={styles.hostedHeader}>
          <Text style={styles.hostedLabel}>SERIES & DOCUMENTARIES</Text>
          <TouchableOpacity onPress={() => navigation.navigate('InternalTv')}>
            <Text style={styles.seeAllText}>See all tv</Text>
          </TouchableOpacity>
        </View>

        {isWatchLoading ? (
          <ActivityIndicator color={COLORS.gold.mid} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.hostedGrid}>
            {hostedSeries.map((item, index) => (
              <TouchableOpacity
                key={`series-${item.id || index}`}
                style={styles.hostedMiniCard}
                onPress={() => navigation.navigate('InternalTv')}
              >
                <Image source={{ uri: transformToCloudFront(item.thumbnailUrl) || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400' }} style={styles.hostedMiniPoster} />
                <Text style={styles.hostedMiniTitle} numberOfLines={1}>{item.seriesTitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.discoveryPrompt}
        onPress={() => handleTabChange('discovery')}
      >
        <Ionicons name="sparkles" size={24} color={COLORS.gold.mid} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.promptTitle}>Can't find what you need?</Text>
          <Text style={styles.promptSubtitle}>Use AI Discovery to find matches from our global catalog</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.silver} />
      </TouchableOpacity>
    </View>
  );

  const renderDiscoveryMode = () => (
    <View style={styles.tabWidth}>
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.heroTitle}>What should you{'\n'}watch tonight?</Text>
        <Text style={styles.heroSubtitle}>
          Select your moods, we'll find the perfect match
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Describe your vibe..."
            placeholderTextColor={COLORS.silver}
            value={vibeText}
            onChangeText={setVibeText}
          />
        </View>

        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.playableToggle, onlyPlayable && styles.playableToggleActive]}
            onPress={() => setOnlyPlayable(!onlyPlayable)}
          >
            <MaterialCommunityIcons
              name={onlyPlayable ? "play-box-multiple" : "play-box-multiple-outline"}
              size={20}
              color={onlyPlayable ? COLORS.background : COLORS.gold.mid}
            />
            <Text style={[styles.playableToggleText, onlyPlayable && styles.playableToggleTextActive]}>
              Playable Now
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.moodGrid}>
          {MOOD_OPTIONS.map((mood) => (
            <MoodChip
              key={mood.label}
              label={mood.label}
              emoji={mood.emoji}
              selected={selectedMoods.includes(mood.label)}
              onToggle={(selected: boolean) => handleMoodToggle(mood.label, selected)}
            />
          ))}
        </View>
      </View>

      <View style={styles.ctaContainer}>
        <View style={{ gap: 16 }}>
          {(selectedMoods.length > 0 || vibeText.trim().length > 0) ? (
            <ButtonPrimary
              onPress={() => handleSearch()}
              fullWidth
              style={styles.primaryBtn}
              disabled={isLoading}
            >
              {isLoading ? 'Finding magic...' : 'See my picks'}
            </ButtonPrimary>
          ) : null}

          <ButtonSecondary
            onPress={() => handleShuffle()}
            fullWidth
            disabled={isLoading}
          >
            {(selectedMoods.length > 0 || vibeText.trim().length > 0) ? 'Surprise me' : 'Shuffle selection'}
          </ButtonSecondary>
        </View>

        <Text style={styles.microcopy}>"Permanent library feel. No rotation."</Text>
      </View>
    </View>
  );

  const renderHeroSection = () => (
    <View style={styles.section}>
      <View style={styles.bgContainer}>
        <Animated.View style={[
          styles.bubble,
          styles.bubble1,
          { opacity: Animated.multiply(bubble1Anim, 0.15) }
        ]} />
        <Animated.View style={[
          styles.bubble,
          styles.bubble2,
          { opacity: Animated.multiply(bubble2Anim, 0.15) }
        ]} />
      </View>

      <Animated.View style={[
        styles.heroHeader,
        {
          opacity: fadeAnim,
          paddingTop: insets.top + SPACING.lg,
        }
      ]}>
        {renderTabToggle()}
      </Animated.View>

      <Animated.ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onHorizontalScroll}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        <Animated.View style={[
          styles.tabContentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            minHeight: height - 150,
          }
        ]}>
          {renderWatchMode()}
          {renderDiscoveryMode()}
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );

  const renderResultsSection = () => (
    <View style={styles.resultsSection}>
      <View style={[
        styles.resultsContent,
        { paddingTop: SPACING.xl }
      ]}>
        <Text style={styles.resultsTitle}>Your Matching Films</Text>

        {results?.explanationTokens && (
          <Text style={styles.explanationTokens}>
            Matches based on: <Text style={styles.goldText}>{results.explanationTokens.join(', ')}</Text>
          </Text>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gold.mid} />
            <Text style={styles.loadingText}>Curating your library...</Text>
          </View>
        ) : results ? (
          <>
            <View style={styles.highlightSection}>
              <Text style={styles.sectionLabel}>THE HIGHLIGHT</Text>
              <HeroCard
                movie={results.hero as MoviePick}
                onViewDetails={(id: string) => navigation.navigate('TitleDetail', { id, movie: results.hero })}
              />
            </View>

            <View style={styles.alternatesSection}>
              <View style={styles.headerWithAction}>
                <Text style={styles.sectionLabel}>OTHER RECOMMENDATIONS</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (viewSize === 'standard') setViewSize('compact');
                    else if (viewSize === 'compact') setViewSize('large');
                    else setViewSize('standard');
                  }}
                  style={styles.viewToggle}
                >
                  <MaterialCommunityIcons
                    name={viewSize === 'compact' ? 'view-grid' : viewSize === 'standard' ? 'view-module' : 'view-agenda'}
                    size={20}
                    color={COLORS.gold.mid}
                  />
                  <Text style={styles.viewToggleText}>
                    {viewSize.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.alternatesGrid}>
                {results.alternates.map((movie: MoviePick) => (
                  <TitleTile
                    key={movie.id}
                    movie={movie}
                    width={getTileWidth()}
                    onPress={(id: string, movieObj: MoviePick) => navigation.navigate('TitleDetail', { id, movie: movieObj })}
                  />
                ))}
              </View>
            </View>

            <View style={styles.repickSection}>
              <Text style={styles.repickLabel}>Not quite right? Let us know what to adjust:</Text>
              <View style={styles.repickChipsContainer}>
                {FEEDBACK_OPTIONS.map((feedback) => (
                  <TouchableOpacity
                    key={feedback}
                    style={styles.feedbackChip}
                    onPress={() => handleRepick(feedback)}
                  >
                    <Text style={styles.feedbackText}>{feedback}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );

  return (
    <ScrollView
      ref={mainScrollRef}
      showsVerticalScrollIndicator={false}
      style={styles.container}
      scrollEnabled={!isLoading || !!results}
    >
      {renderHeroSection()}
      {(results || isLoading) && renderResultsSection()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    width: width,
  },
  bgContainer: {
    position: 'absolute',
    inset: 0,
    zIndex: -1,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
  },
  bubble1: {
    top: '15%',
    left: '10%',
    width: 250,
    height: 250,
    backgroundColor: COLORS.accent.purple,
    filter: 'blur(60px)',
  },
  bubble2: {
    bottom: '20%',
    right: '5%',
    width: 300,
    height: 300,
    backgroundColor: COLORS.gold.mid,
    filter: 'blur(80px)',
  },
  heroHeader: {
    paddingHorizontal: SPACING.xl,
    zIndex: 10,
  },
  tabContentContainer: {
    flexDirection: 'row',
    width: width * 2,
    paddingBottom: 40,
  },
  tabWidth: {
    width: width,
    paddingHorizontal: SPACING.xl,
  },
  resultsSection: {
    width: width,
    backgroundColor: COLORS.background,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.gold.mid,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 8,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 15,
    color: COLORS.silver,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  textInput: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(167, 171, 180, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(167, 171, 180, 0.2)',
    borderRadius: 28,
    paddingHorizontal: 24,
    fontSize: 16,
    color: COLORS.text,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ctaContainer: {
    width: '100%',
    gap: 16,
  },
  primaryBtn: {
    shadowColor: COLORS.gold.mid,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  microcopy: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.silver,
    fontStyle: 'italic',
    opacity: 0.6,
    textAlign: 'center',
  },
  resultsContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 160,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    paddingHorizontal: SPACING.sm,
  },
  explanationTokens: {
    color: COLORS.silver,
    fontSize: 14,
    marginBottom: 24,
    paddingHorizontal: SPACING.sm,
  },
  goldText: {
    color: COLORS.gold.mid,
    fontWeight: '600',
  },
  highlightSection: {
    marginBottom: 40,
  },
  headerWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: SPACING.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.silver,
    letterSpacing: 2,
    paddingHorizontal: SPACING.sm,
    textTransform: 'uppercase',
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  viewToggleText: {
    color: COLORS.gold.mid,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  alternatesSection: {
    marginBottom: 48,
  },
  alternatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  playableToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  playableToggleActive: {
    backgroundColor: COLORS.gold.mid,
  },
  playableToggleText: {
    color: COLORS.gold.mid,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  playableToggleTextActive: {
    color: COLORS.background,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.silver,
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  repickSection: {
    paddingHorizontal: SPACING.sm,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(167, 171, 180, 0.1)',
  },
  repickLabel: {
    color: COLORS.silver,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  repickChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  feedbackChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(11, 11, 13, 0.5)',
    borderWidth: 2,
    borderColor: COLORS.silver,
  },
  feedbackText: {
    color: COLORS.silver,
    fontSize: 13,
    fontWeight: '600',
  },
  tabToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(167, 171, 180, 0.1)',
    borderRadius: 25,
    padding: 4,
    marginBottom: 32,
    alignSelf: 'center',
    width: 260,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 21,
    gap: 6,
  },
  tabSlider: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 126, // (260 - 8) / 2
    height: 42, // container height 50 approx - 8
    backgroundColor: COLORS.gold.mid,
    borderRadius: 21,
    shadowColor: COLORS.gold.mid,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  activeTabButtonText: {
    color: COLORS.background,
  },
  tabButtonText: {
    color: COLORS.silver,
    fontSize: 14,
    fontWeight: '700',
  },
  watchModeContainer: {
    width: '100%',
  },
  watchHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  watchTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  watchSubtitle: {
    fontSize: 16,
    color: COLORS.gold.mid,
    fontWeight: '600',
    marginTop: 4,
  },
  hostedSummary: {
    marginBottom: 32,
  },
  hostedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  hostedLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.silver,
    letterSpacing: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold.mid,
  },
  hostedGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  hostedMiniCard: {
    width: (width - SPACING.xl * 2 - 12) / 2,
    marginBottom: 4,
  },
  hostedMiniPoster: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  hostedMiniTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  discoveryPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
  },
  promptTitle: {
    color: COLORS.gold.mid,
    fontSize: 15,
    fontWeight: '800',
  },
  promptSubtitle: {
    color: COLORS.silver,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  }
});
