import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING } from '../theme/tokens';
import { MOOD_OPTIONS } from '../lib/constants';
import { useSession } from '../context/SessionContext';

const GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'War',
];

export const OnboardingScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useSession();
  const [step, setStep] = useState(0);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);

  const steps = useMemo(() => [
    { title: 'Pick your genres', subtitle: 'Choose a few genres you love so we can personalize Discovery.' },
    { title: 'Set the mood', subtitle: 'Select moods that match how you like to watch.' },
    { title: 'All set', subtitle: 'We will tailor Discovery based on your preferences.' },
  ], []);

  const toggleItem = (list: string[], value: string, setter: (next: string[]) => void) => {
    if (list.includes(value)) {
      setter(list.filter((item) => item !== value));
    } else {
      setter([...list, value]);
    }
  };

  const handleFinish = async () => {
    await SecureStore.setItemAsync('@nolimitflix_onboarding_completed', 'true');
    await SecureStore.setItemAsync('@nolimitflix_pref_genres', JSON.stringify(selectedGenres));
    await SecureStore.setItemAsync('@nolimitflix_pref_moods', JSON.stringify(selectedMoods));
    navigation.reset({ index: 0, routes: [{ name: user ? 'MainTabs' : 'Welcome' }] });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepText}>Step {step + 1}/3</Text>
        <TouchableOpacity onPress={handleFinish}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{steps[step].title}</Text>
      <Text style={styles.subtitle}>{steps[step].subtitle}</Text>

      <ScrollView contentContainerStyle={styles.optionsWrap} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <View style={styles.grid}>
            {GENRES.map((genre) => (
              <TouchableOpacity
                key={genre}
                style={[styles.chip, selectedGenres.includes(genre) && styles.chipActive]}
                onPress={() => toggleItem(selectedGenres, genre, setSelectedGenres)}
              >
                <Text style={[styles.chipText, selectedGenres.includes(genre) && styles.chipTextActive]}>{genre}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 1 && (
          <View style={styles.grid}>
            {MOOD_OPTIONS.map((mood) => (
              <TouchableOpacity
                key={mood.label}
                style={[styles.chip, selectedMoods.includes(mood.label) && styles.chipActive]}
                onPress={() => toggleItem(selectedMoods, mood.label, setSelectedMoods)}
              >
                <Text style={[styles.chipText, selectedMoods.includes(mood.label) && styles.chipTextActive]}>
                  {mood.emoji} {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 2 && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Your picks</Text>
            <Text style={styles.summaryLabel}>Genres</Text>
            <Text style={styles.summaryText}>
              {selectedGenres.length ? selectedGenres.join(', ') : 'No genres selected'}
            </Text>
            <Text style={styles.summaryLabel}>Moods</Text>
            <Text style={styles.summaryText}>
              {selectedMoods.length ? selectedMoods.join(', ') : 'No moods selected'}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(step - 1)}>
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 100 }} />
        )}

        {step < 2 ? (
          <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(step + 1)}>
            <Text style={styles.primaryText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
            <Text style={styles.primaryText}>Finish</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepText: {
    color: COLORS.silver,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '700',
  },
  skipText: {
    color: COLORS.gold.mid,
    fontWeight: '700',
    fontSize: 13,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 20,
  },
  subtitle: {
    color: COLORS.silver,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  optionsWrap: {
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(167,171,180,0.2)',
    backgroundColor: 'rgba(17,17,20,0.6)',
  },
  chipActive: {
    borderColor: 'rgba(212,175,55,0.6)',
    backgroundColor: 'rgba(212,175,55,0.15)',
  },
  chipText: {
    color: COLORS.silver,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.text,
  },
  summaryBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(167,171,180,0.2)',
    backgroundColor: 'rgba(17,17,20,0.8)',
    padding: 16,
    gap: 8,
  },
  summaryTitle: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 16,
  },
  summaryLabel: {
    color: COLORS.silver,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
  },
  summaryText: {
    color: COLORS.text,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.gold.mid,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  primaryText: {
    color: COLORS.background,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(167,171,180,0.3)',
  },
  secondaryText: {
    color: COLORS.silver,
    fontWeight: '600',
  },
});
