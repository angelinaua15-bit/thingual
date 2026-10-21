import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useTheme, radius, fonts } from '../theme/tokens';
import { Txt, PressableScale } from './ui';
import { coverFor } from '../data/photos';
import { fullWord, labelOf } from '../data/concepts';
import { LangCode } from '../data/languages';

const BLUR = 'L6Bg#2?=Q:w}y9yBtLMxRCofsCWB';

export function Photo({ uri, style, contentFit = 'cover', transition = 300 }: { uri?: string; style?: StyleProp<ImageStyle>; contentFit?: 'cover' | 'contain'; transition?: number }) {
  const { c } = useTheme();
  return (
    <Image
      source={uri ? { uri } : undefined}
      placeholder={{ blurhash: BLUR }}
      style={[{ backgroundColor: c.surfaceAlt }, style]}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk"
    />
  );
}

export const photoForWord = (conceptId: string, own?: string, w = 600) => own || coverFor(conceptId, w);

/** Thin ring around a circular photo: New → Familiar → Confident → Learned. */
export function MasteryRing({ level, size, children }: { level: 0 | 1 | 2 | 3; size: number; children: React.ReactNode }) {
  const { c } = useTheme();
  const r = size / 2 - 2;
  const circ = 2 * Math.PI * r;
  const frac = [0.08, 0.38, 0.7, 1][level];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.divider} strokeWidth={2} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={level === 3 ? c.success : c.accent}
          strokeWidth={2}
          fill="none"
          strokeDasharray={`${circ * frac} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ width: size - 8, height: size - 8, borderRadius: size, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

export function MasteryDots({ level }: { level: 0 | 1 | 2 | 3 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: i < level ? '#FFFFFF' : 'rgba(255,255,255,0.35)' }} />
      ))}
    </View>
  );
}

/** Photo tile with the word over a soft gradient. */
export function WordTile({
  conceptId, lang, photo, onPress, size = 160, level, style, sub,
}: { conceptId: string; lang: LangCode; photo?: string; onPress?: () => void; size?: number; level?: 0 | 1 | 2 | 3; style?: StyleProp<ViewStyle>; sub?: string }) {
  const l = labelOf(conceptId, lang);
  return (
    <PressableScale onPress={onPress} style={[{ width: size, height: size * 1.25, borderRadius: radius.l, overflow: 'hidden' }, style]}>
      <Photo uri={photoForWord(conceptId, photo, 500)} style={StyleSheet.absoluteFill as StyleProp<ImageStyle>} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={[StyleSheet.absoluteFill, { top: '45%' }]} />
      {level !== undefined && (
        <View style={{ position: 'absolute', top: 10, right: 10 }}>
          <MasteryDots level={level} />
        </View>
      )}
      <View style={{ position: 'absolute', left: 12, right: 12, bottom: 10 }}>
        {l?.article ? <Txt v="caption" color="rgba(255,255,255,0.75)">{l.article}</Txt> : null}
        <Txt numberOfLines={1} style={{ fontFamily: fonts.serif, fontSize: 24, lineHeight: 28, color: '#fff' }}>{l?.word ?? fullWord(conceptId, lang)}</Txt>
        {sub ? <Txt v="caption" numberOfLines={1} color="rgba(255,255,255,0.75)">{sub}</Txt> : null}
      </View>
    </PressableScale>
  );
}
