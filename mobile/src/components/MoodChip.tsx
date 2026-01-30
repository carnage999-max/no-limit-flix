import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  View,
} from 'react-native';
import { COLORS } from '../theme/tokens';

interface MoodChipProps {
  label: string;
  emoji?: string;
  selected?: boolean;
  onToggle?: (selected: boolean) => void;
}

export const MoodChip: React.FC<MoodChipProps> = ({ 
  label, 
  emoji, 
  selected = false, 
  onToggle 
}) => {
  const handlePress = () => {
    onToggle?.(!selected);
  };

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      activeOpacity={0.8}
      style={[
        styles.container, 
        selected ? styles.selectedContainer : styles.unselectedContainer
      ]}
    >
      <View style={styles.inner}>
        {emoji && <Text style={styles.emoji}>{emoji}</Text>}
        <Text style={[styles.label, selected ? styles.labelSelected : styles.labelUnselected]}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  unselectedContainer: {
    borderColor: 'rgba(167, 171, 180, 0.2)',
    backgroundColor: 'rgba(167, 171, 180, 0.05)',
  },
  selectedContainer: {
    borderColor: COLORS.gold.mid,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  emoji: {
    fontSize: 12,
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelUnselected: {
    color: COLORS.silver,
  },
  labelSelected: {
    color: COLORS.gold.mid,
  },
});
