import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND } from '../theme/tokens';

/** Deep green → deep navy backdrop used for dark screens instead of plain black. */
export function BrandBackground() {
  return <LinearGradient pointerEvents="none" colors={BRAND.grad} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />;
}
