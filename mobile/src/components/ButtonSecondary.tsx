import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  Animated,
} from 'react-native';
import { COLORS, TYPOGRAPHY } from '../theme/tokens';

interface ButtonSecondaryProps {
  onPress: () => void;
  children: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const ButtonSecondary: React.FC<ButtonSecondaryProps> = ({ 
  onPress, 
  children, 
  fullWidth = false,
  style 
}) => {
  const animatedValue = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(animatedValue, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animatedValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        fullWidth && styles.fullWidth,
        style
      ]}
    >
      <Animated.View style={[styles.inner, { transform: [{ scale: animatedValue }] }]}>
        <Text style={styles.text}>{children}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.silver,
    overflow: 'hidden',
  },
  inner: {
    paddingVertical: 14, // Adjusted for border
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    color: COLORS.silver,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
  },
});
