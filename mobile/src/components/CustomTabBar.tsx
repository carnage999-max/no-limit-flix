import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/tokens';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width - 20;

const ICONS: Record<string, any> = {
  Home: { active: 'movie-open', inactive: 'movie-open-outline' },
  Collections: { active: 'layers-triple', inactive: 'layers-triple-outline' },
  Search: { active: 'magnify', inactive: 'magnify' },
  Library: { active: 'bookmark', inactive: 'bookmark-outline' },
  Account: { active: 'account', inactive: 'account-outline' },
};

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { bottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
      <View style={styles.content}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              onPress={onPress}
              name={route.name}
            />
          );
        })}
      </View>
    </View>
  );
};

interface TabItemProps {
  isFocused: boolean;
  onPress: () => void;
  name: string;
}

const TabItem: React.FC<TabItemProps> = ({ isFocused, onPress, name }) => {
  const animatedValue = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [isFocused]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const bubbleScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const bubbleOpacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const labelOpacity = animatedValue.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0, 0, 1],
  });

  const labelTranslateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [4, -2],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.tabButton}
    >
      <View style={styles.iconContainer}>
        {/* Glow / Bubble Background */}
        <Animated.View
          style={[
            styles.bubbleContainer,
            {
              opacity: bubbleOpacity,
              transform: [{ scale: bubbleScale }, { translateY: -12 }],
            },
          ]}
        >
          <LinearGradient
            colors={[COLORS.gold.light, COLORS.gold.mid, COLORS.gold.dark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bubble}
          />
        </Animated.View>

        {/* Icon */}
        <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
          <MaterialCommunityIcons
            name={isFocused ? ICONS[name].active : ICONS[name].inactive}
            size={24}
            color={isFocused ? COLORS.background : COLORS.silver}
            style={!isFocused ? { opacity: 0.6 } : {}}
          />
        </Animated.View>

        {/* Label (Visible only when focused) */}
        <Animated.Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[
            styles.label,
            {
              opacity: labelOpacity,
              transform: [{ translateY: labelTranslateY }],
            },
          ]}
        >
          {name}
        </Animated.Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 10,
    right: 10,
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    width: TAB_BAR_WIDTH,
    height: 72,
    backgroundColor: 'rgba(11, 11, 13, 0.98)',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(167, 171, 180, 0.15)',
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.mid,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  bubbleContainer: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  bubble: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  label: {
    position: 'absolute',
    bottom: 6,
    color: COLORS.gold.mid,
    fontSize: 8.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: '90%',
    textAlign: 'center',
  },
});
