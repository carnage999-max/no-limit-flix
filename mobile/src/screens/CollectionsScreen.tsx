import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme/tokens';
import { COLLECTIONS } from '../lib/constants';

export const CollectionsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.gold.mid}
            colors={[COLORS.gold.mid]}
          />
        }
      >
        <Text style={styles.title}>Explore Collections</Text>
        <Text style={styles.subtitle}>Curated selections that promise a specific feeling.</Text>

        <View style={styles.grid}>
          {COLLECTIONS.map((collection) => (
            <TouchableOpacity 
              key={collection.slug} 
              style={[styles.card, { borderColor: collection.accentColor + '33' }]}
              onPress={() => navigation.navigate('CollectionDetail', { id: collection.slug })}
            >
              <Text style={[styles.cardTitle, { color: collection.accentColor }]}>
                {collection.title}
              </Text>
              <Text style={styles.promiseText}>{collection.description}</Text>
              
              <View style={styles.footer}>
                <Text style={styles.count}>{collection.count} Titles</Text>
                <Text style={styles.arrow}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
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
    paddingTop: 80,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 140,
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.silver,
    fontSize: 16,
    marginBottom: 40,
    lineHeight: 24,
  },
  grid: {
    gap: 20,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(167, 171, 180, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(167, 171, 180, 0.1)',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  promiseText: {
    color: COLORS.silver,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: {
    color: COLORS.silver,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  arrow: {
    color: COLORS.silver,
    fontSize: 20,
  }
});
