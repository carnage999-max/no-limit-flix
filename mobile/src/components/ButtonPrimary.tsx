import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  Animated,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY } from '../theme/tokens';

interface ButtonPrimaryProps {
  onPress: () => void;
  children: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const ButtonPrimary: React.FC<ButtonPrimaryProps> = ({ 
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
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        fullWidth && styles.fullWidth,
        style
      ]}
    >
      <Animated.View style={{ transform: [{ scale: animatedValue }], width: '100%' }}>
        <LinearGradient
          colors={[COLORS.gold.light, COLORS.gold.mid, COLORS.gold.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Text style={styles.text}>{children}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.light,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  text: {
    color: COLORS.background,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
