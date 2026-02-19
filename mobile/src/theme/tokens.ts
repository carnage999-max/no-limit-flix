import { Platform } from 'react-native';

export const COLORS = {
  background: '#0B0B0D',
  foreground: '#F3F4F6',
  text: '#F3F4F6',
  silver: '#A7ABB4',

  // Gold Coin Gradient
  gold: {
    light: '#F6D365',
    mid: '#D4AF37',
    dark: '#B8860B',
  },

  // Accents
  accent: {
    purple: '#8B5CF6',
    blue: '#3B82F6',
    teal: '#14B8A6',
    rose: '#F43F5E',
    red: '#EF4444',
  },

  button: {
    primary: '#D4AF37', // Fallback if gradient fails
    primaryText: '#0B0B0D',
    secondary: 'transparent',
    secondaryText: '#A7ABB4',
    secondaryBorder: '#A7ABB4',
  }
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 32,
};

export const TYPOGRAPHY = {
  fonts: {
    regular: Platform.OS === 'ios' ? 'Inter' : 'sans-serif', // Using system for now, will add Inter in later steps if needed
    medium: Platform.OS === 'ios' ? 'Inter-Medium' : 'sans-serif-medium',
    bold: Platform.OS === 'ios' ? 'Inter-Bold' : 'sans-serif-bold',
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    display: 48,
    hero: 56,
  }
};

export const SHADOWS = {
  gold: {
    shadowColor: '#F6D365',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  }
};
