import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EmojiArt } from './NoteBits';
import { Floaty } from './Fx';
import { useTheme } from '../theme/tokens';

type Phase = 'morning' | 'day' | 'evening' | 'night';
const phaseNow = (): Phase => {
  const h = new Date().getHours();
  return h >= 5 && h < 10 ? 'morning' : h >= 10 && h < 17 ? 'day' : h >= 17 && h < 21 ? 'evening' : 'night';
};

const SKY: Record<Phase, { light: [string, string, string]; dark: [string, string, string]; deco: string[] }> = {
  morning: { light: ['#FFE9D6', '#FFF6EC', '#F8FAF6'], dark: ['#1E2A44', '#16283A', '#0B2129'], deco: ['🌅', '☁️', '🐦'] },
  day: { light: ['#D9F1FF', '#EEF8FF', '#F8FAF6'], dark: ['#10314A', '#0F2A3A', '#0B2129'], deco: ['☀️', '☁️', '☁️'] },
  evening: { light: ['#FFD9C2', '#FBE7E4', '#F6F2F8'], dark: ['#2B1E44', '#1C1E3A', '#0B2129'], deco: ['🌇', '☁️', '⭐'] },
  night: { light: ['#DCE3FF', '#EEF0FF', '#F6F6FB'], dark: ['#0A1230', '#0B1A33', '#0B2129'], deco: ['🌙', '⭐', '✨'] },
};

/** The path's sky follows the clock: sunrise, a blue day, a pink evening, a starry night. */
export function Sky() {
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const ph = useMemo(phaseNow, []);
  const sky = SKY[ph];
  const spots = [
    { top: '10%', left: width * 0.06, size: 46 },
    { top: '30%', left: width * 0.72, size: 40 },
    { top: '58%', left: width * 0.12, size: 34 },
    { top: '78%', left: width * 0.78, size: 30 },
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={isDark ? sky.dark : sky.light} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      {spots.map((p, i) => (
        <Floaty key={i} amp={10} period={4200 + i * 900} delay={i * 500} style={{ position: 'absolute', top: p.top as never, left: p.left, opacity: isDark ? 0.5 : 0.55 }}>
          <EmojiArt emoji={sky.deco[i % sky.deco.length]} size={p.size} />
        </Floaty>
      ))}
    </View>
  );
}
