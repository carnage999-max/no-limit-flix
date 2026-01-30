import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/tokens';

export const AccountScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Account Screen (Placeholder)</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  text: { color: COLORS.text, fontSize: 24 }
});
