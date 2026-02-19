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
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

const { height, width } = Dimensions.get('window');

export const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const mainScrollRef = useRef<ScrollView>(null);

  // State
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [vibeText, setVibeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AIPickResponse | null>(null);
  const [viewSize, setViewSize] = useState<'compact' | 'standard' | 'large'>('standard');
  const [onlyPlayable, setOnlyPlayable] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const bubble1Anim = useRef(new Animated.Value(0)).current;
  const bubble2Anim = useRef(new Animated.Value(0)).current;

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

  const handleMoodToggle = (moodLabel: string, selected: boolean) => {
    setSelectedMoods((prev: string[]) =>
      selected ? [...prev, moodLabel] : prev.filter((m: string) => m !== moodLabel)
    );
  };

  const handleSearch = async (overrideMoods?: string[], overrideVibe?: string) => {
    if (isLoading) return;

    // Smoothly scroll to results section
    mainScrollRef.current?.scrollTo({ y: height, animated: true });

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

      // Phase 2: Client-side filter if "Only show playable" is checked
      // In a real prod app, the API would handle this to ensure we still get N results,
      // but for this implementation we'll filter the results.
      if (onlyPlayable && response) {
        // We'll keep results that are playable. If hero isn't playable, we'll swap it.
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
    // Pick 2 random moods from options
    const shuffled = [...MOOD_OPTIONS].sort(() => 0.5 - Math.random());
    const randomMoods = shuffled.slice(0, 2).map(m => m.label);

    setVibeText('');
    setSelectedMoods(randomMoods);

    // Trigger search immediately with the new moods
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

  const renderHeroSection = () => (
    <View style={styles.section}>
      {/* Animated Background */}
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
        styles.heroContent,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          paddingTop: insets.top + SPACING.xl,
          minHeight: height,
          justifyContent: 'center',
        }
      ]}>
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
              onPress={handleShuffle}
              fullWidth
              disabled={isLoading}
            >
              {(selectedMoods.length > 0 || vibeText.trim().length > 0) ? 'Surprise me' : 'Shuffle selection'}
            </ButtonSecondary>
          </View>

          <Text style={styles.microcopy}>"Permanent library feel. No rotation."</Text>
        </View>

        {/* Available to Watch - Integrated into Hero for better flow */}
        <View style={styles.quickAccessCompact}>
          <Text style={styles.sectionLabel}>Available to Watch</Text>
          <View style={styles.quickAccessRow}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('InternalMovies')}
            >
              <MaterialCommunityIcons name="filmstrip" size={24} color={COLORS.gold.mid} />
              <Text style={styles.quickCardText}>Movies</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('InternalTv')}
            >
              <MaterialCommunityIcons name="television-classic" size={24} color={COLORS.gold.mid} />
              <Text style={styles.quickCardText}>Series</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
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
    justifyContent: 'center',
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
  heroContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 110,
  },
  resultsSection: {
    width: width,
    backgroundColor: COLORS.background,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.gold.mid,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 8,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.silver,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
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
  quickAccessSection: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: 32,
    backgroundColor: COLORS.background,
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  quickCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 12,
  },
  quickCardText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
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
  quickAccessCompact: {
    marginTop: 32,
    width: '100%',
  },
  cutout: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 40,
    backgroundColor: COLORS.background,
  }
});
