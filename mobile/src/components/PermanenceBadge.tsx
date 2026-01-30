import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/tokens';

interface PermanenceBadgeProps {
  type?: 'Permanent Core' | 'Long-Term' | 'Licensed';
}

export const PermanenceBadge: React.FC<PermanenceBadgeProps> = ({ type = 'Licensed' }) => {
  const getColors = () => {
    switch (type) {
      case 'Permanent Core':
        return { bg: 'rgba(212, 175, 55, 0.15)', text: COLORS.gold.mid, border: COLORS.gold.mid };
      case 'Long-Term':
        return { bg: 'rgba(167, 171, 180, 0.1)', text: COLORS.silver, border: COLORS.silver };
      default:
        return { bg: 'rgba(167, 171, 180, 0.05)', text: COLORS.silver + '88', border: COLORS.silver + '44' };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {type.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 0.5,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
