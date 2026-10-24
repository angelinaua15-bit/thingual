import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Check, Gift, Heart, Lock, MessageCircle, Star, Trophy } from './icons';
import { Txt, PressableScale } from './ui';
import { EmojiArt } from './NoteBits';
import { useTheme, fonts } from '../theme/tokens';
import { useT } from '../i18n';
import { useApp, heartsOf, HEARTS_MAX } from '../store/useApp';
import { useIsMax } from '../lib/premium';
import type { NodeKind } from '../data/path';

export const MASCOT = '🦊';

/** Hearts left for path lessons (∞ with Max). Ticks once a minute so refills show up. */
export function useHearts() {
  const raw = useApp((s) => s.hearts);
  const max = useIsMax();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const h = heartsOf({ hearts: raw });
  return { ...h, unlimited: max, full: h.n >= HEARTS_MAX };
}

export function HeartsPill({ onPress }: { onPress?: () => void }) {
  const { c } = useTheme();
  const h = useHearts();
  return (
    <PressableScale onPress={onPress ?? (() => router.push('/hearts'))} style={[styles.pill, { backgroundColor: c.surface, borderColor: c.divider }]} accessibilityLabel="hearts">
      <Heart size={15} color="#F43F5E" fill="#F43F5E" />
      <Txt v="captionMedium" style={{ fontVariant: ['tabular-nums'] }}>{h.unlimited ? '∞' : h.n}</Txt>
    </PressableScale>
  );
}

/** Darker shade of a hex colour for the "3D" lip under buttons. */
export const shade = (hex: string, k = 0.78) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (x: number) => Math.round(x * k).toString(16).padStart(2, '0');
  return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`;
};

const ICON: Record<NodeKind, typeof Star> = { lesson: Star, phrases: MessageCircle, chest: Gift, review: Trophy };

/** Round lesson button on the path. */
export function PathNodeButton({ kind, status, color, onPress, label }: { kind: NodeKind; status: 'done' | 'current' | 'open' | 'locked'; color: string; onPress: () => void; label: string }) {
  const { c, isDark } = useTheme();
  const pulse = useSharedValue(1);
  const bob = useSharedValue(0);
  useEffect(() => {
    if (status !== 'current') return;
    pulse.value = withRepeat(withSequence(withTiming(1.12, { duration: 900 }), withTiming(1, { duration: 900 })), -1);
    bob.value = withRepeat(withSequence(withTiming(-5, { duration: 700, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) })), -1);
  }, [status]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }], opacity: 2 - pulse.value * 1.4 }));
  const bubble = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  const locked = status === 'locked';
  const bg = locked ? (isDark ? '#2B4650' : '#E3E2DD') : kind === 'chest' && status !== 'done' ? '#F59E0B' : color;
  const Icon = status === 'done' && kind !== 'chest' ? Check : locked && kind !== 'chest' ? Lock : ICON[kind];
  const size = kind === 'review' ? 78 : 70;
  return (
    <View style={{ alignItems: 'center' }}>
      {status === 'current' && (
        <Animated.View style={[styles.bubble, { backgroundColor: c.surface, borderColor: c.divider }, bubble]}>
          <Txt v="captionMedium" style={{ color, fontFamily: fonts.semibold }}>{label}</Txt>
          <View style={[styles.tail, { backgroundColor: c.surface, borderColor: c.divider }]} />
        </Animated.View>
      )}
      <View style={{ width: size + 18, height: size + 18, alignItems: 'center', justifyContent: 'center' }}>
        {status === 'current' && <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 99, borderWidth: 5, borderColor: color }, ring]} />}
        <PressableScale onPress={onPress} scaleTo={0.92} accessibilityRole="button" accessibilityLabel={`${kind} ${status}`}
          style={[styles.node, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderBottomColor: locked ? (isDark ? '#1E343C' : '#C9C8C2') : shade(bg) }]}>
          {kind === 'chest' && status !== 'done' ? (
            <EmojiArt emoji="🎁" size={38} />
          ) : (
            <Icon size={kind === 'review' ? 32 : 28} color={locked ? (isDark ? '#5E7A83' : '#A8A7A1') : '#fff'} strokeWidth={2.8} fill={kind === 'lesson' && status !== 'locked' && status !== 'done' ? '#fff' : 'transparent'} />
          )}
        </PressableScale>
      </View>
    </View>
  );
}

/** The fox who keeps you company on the path. */
export function Mascot({ size = 84, say }: { size?: number; say?: string }) {
  const { c } = useTheme();
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withSequence(withTiming(-6, { duration: 1100, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) })), -1);
  }, []);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={{ alignItems: 'center' }}>
      {say ? (
        <View style={[styles.say, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <Txt v="caption" center>{say}</Txt>
        </View>
      ) : null}
      <Animated.View style={a}><EmojiArt emoji={MASCOT} size={size} /></Animated.View>
    </View>
  );
}

export function useMascotLine() {
  const { ta } = useT() as unknown as { ta: (k: string) => string[] };
  const lines = ta?.('path.mascot') ?? [];
  const [i] = useState(() => Math.floor(Math.random() * 100));
  return lines.length ? lines[i % lines.length] : '';
}

/** Big rounded button with a darker lip, like the path nodes. */
export function ChunkyButton({ title, color, onPress, disabled }: { title: string; color: string; onPress: () => void; disabled?: boolean }) {
  const { c, isDark } = useTheme();
  const bg = disabled ? (isDark ? '#23424B' : '#E5E4DF') : color;
  return (
    <PressableScale onPress={disabled ? undefined : onPress} scaleTo={0.98} accessibilityRole="button" accessibilityState={{ disabled }}
      style={[styles.chunky, { backgroundColor: bg, borderBottomColor: disabled ? 'transparent' : shade(color) }]}>
      <Txt style={{ fontFamily: fonts.semibold, fontSize: 16, letterSpacing: 0.6, textTransform: 'uppercase', color: disabled ? c.textTertiary : '#fff' }}>{title}</Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chunky: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 10, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  node: { alignItems: 'center', justifyContent: 'center', borderBottomWidth: 6 },
  bubble: { position: 'absolute', top: -40, zIndex: 2, paddingHorizontal: 14, height: 34, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  tail: { position: 'absolute', bottom: -6, width: 10, height: 10, transform: [{ rotate: '45deg' }], borderRightWidth: 1.5, borderBottomWidth: 1.5 },
  say: { maxWidth: 150, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
});
