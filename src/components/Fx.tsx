import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { EmojiArt } from './NoteBits';
import { Txt } from './ui';
import { useApp } from '../store/useApp';

/** Animations respect the "reduce motion" setting. */
export const useCalm = () => useApp((s) => s.settings.reduceMotion);

const COLORS = ['#FF4D6D', '#FFB703', '#2FB574', '#3B82F6', '#8B5CF6', '#F97316', '#14B8A6', '#FDE047'];
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** One confetti piece: a CSS animation (runs on the UI/compositor thread, cheap even for many pieces). */
function Piece({ h, delay, x0, color, shape, dur }: { w: number; h: number; delay: number; x0: number; color: string; shape: number; dur: number }) {
  const anim = useMemo(() => {
    const drift = rnd(-90, 90);
    const spin = rnd(360, 1080) * (Math.random() < 0.5 ? -1 : 1);
    return {
      from: { opacity: 1, transform: [{ translateX: x0 }, { translateY: -30 }, { rotate: '0deg' }] },
      '50%': { opacity: 1, transform: [{ translateX: x0 + drift * 0.6 }, { translateY: h * 0.5 }, { rotate: `${spin / 2}deg` }] },
      '85%': { opacity: 1 },
      to: { opacity: 0, transform: [{ translateX: x0 + drift }, { translateY: h + 30 }, { rotate: `${spin}deg` }] },
    };
  }, [x0, h]);
  const size = shape === 2 ? 9 : 8;
  return (
    <Animated.View
      style={[styles.piece, { width: shape === 0 ? 6 : size, height: shape === 0 ? 13 : size, borderRadius: shape === 2 ? size : 2, backgroundColor: color, opacity: 0,
        animationName: anim, animationDuration: dur, animationDelay: delay, animationTimingFunction: 'ease-in', animationFillMode: 'both' } as never]}
    />
  );
}

/** Falling confetti over the whole screen. Re-mount (change `key`) to fire again. */
export function Confetti({ count = 70, duration = 2600 }: { count?: number; duration?: number }) {
  const { width, height } = useWindowDimensions();
  const calm = useCalm();
  const pieces = useMemo(
    () => Array.from({ length: calm ? 0 : count }, (_, i) => ({ i, x0: rnd(0, width), delay: rnd(0, 500), color: COLORS[i % COLORS.length], shape: i % 3, dur: rnd(duration * 0.7, duration * 1.2) })),
    [width, count, calm],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => <Piece key={p.i} w={width} h={height} delay={p.delay} x0={p.x0} color={p.color} shape={p.shape} dur={p.dur} />)}
    </View>
  );
}

function Spark({ emoji, angle, dist, size, delay }: { emoji: string; angle: number; dist: number; size: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, []);
  const st = useAnimatedStyle(() => ({
    opacity: t.value < 0.7 ? 1 : (1 - t.value) / 0.3,
    transform: [
      { translateX: Math.cos(angle) * dist * t.value },
      { translateY: Math.sin(angle) * dist * t.value + 40 * t.value * t.value },
      { scale: 0.4 + t.value * 0.8 },
      { rotate: `${t.value * 200}deg` },
    ],
  }));
  return <Animated.View style={[styles.spark, st]}><EmojiArt emoji={emoji} size={size} /></Animated.View>;
}

/** Things flying out of a point: gems from a chest, stars from a node, hearts… */
export function Burst({ emoji = '💎', count = 12, size = 26, radius = 140 }: { emoji?: string | string[]; count?: number; size?: number; radius?: number }) {
  const calm = useCalm();
  const parts = useMemo(
    () => Array.from({ length: calm ? 0 : count }, (_, i) => ({
      i, angle: (i / count) * Math.PI * 2 + rnd(-0.3, 0.3), dist: rnd(radius * 0.6, radius), delay: rnd(0, 120),
      e: Array.isArray(emoji) ? emoji[i % emoji.length] : emoji,
    })),
    [count, calm],
  );
  return (
    <View pointerEvents="none" style={styles.burst}>
      {parts.map((p) => <Spark key={p.i} emoji={p.e} angle={p.angle} dist={p.dist} size={size} delay={p.delay} />)}
    </View>
  );
}

/** A number that counts up (XP, points). */
export function CountUp({ to, from = 0, duration = 900, style, prefix = '' }: { to: number; from?: number; duration?: number; style?: object; prefix?: string }) {
  const [n, setN] = useState(from);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - start) / duration);
      setN(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k >= 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [to]);
  return <Txt style={style}>{prefix}{n}</Txt>;
}

/** Fox moods for the mascot: idle bob, happy jump, sad droop, dance. */
export type Mood = 'idle' | 'happy' | 'sad' | 'dance' | 'sleep';
export function useMoodStyle(mood: Mood, key?: unknown) {
  const y = useSharedValue(0);
  const r = useSharedValue(0);
  const s = useSharedValue(1);
  const calm = useCalm();
  useEffect(() => {
    cancelAnimation(y); cancelAnimation(r); cancelAnimation(s);
    if (calm) { y.value = 0; r.value = 0; s.value = 1; return; }
    if (mood === 'idle') {
      r.value = withTiming(0); s.value = withTiming(1);
      y.value = withRepeat(withSequence(withTiming(-6, { duration: 1100, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) })), -1);
    } else if (mood === 'happy') {
      y.value = withSequence(withTiming(-28, { duration: 180, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 6 }));
      s.value = withSequence(withTiming(1.15, { duration: 180 }), withSpring(1, { damping: 7 }));
      r.value = withSequence(withTiming(-10, { duration: 120 }), withTiming(10, { duration: 140 }), withSpring(0));
    } else if (mood === 'sad') {
      y.value = withSpring(6, { damping: 12 });
      r.value = withSequence(withTiming(-6, { duration: 90 }), withTiming(6, { duration: 90 }), withTiming(-4, { duration: 90 }), withTiming(0, { duration: 90 }));
      s.value = withSpring(0.94);
    } else if (mood === 'sleep') {
      // slow breathing, head on one side
      y.value = withTiming(4);
      r.value = withTiming(10, { duration: 600 });
      s.value = withRepeat(withSequence(withTiming(1.04, { duration: 1600, easing: Easing.inOut(Easing.sin) }), withTiming(0.97, { duration: 1600, easing: Easing.inOut(Easing.sin) })), -1);
    } else {
      y.value = withRepeat(withSequence(withTiming(-18, { duration: 260, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) })), -1);
      r.value = withRepeat(withSequence(withTiming(-12, { duration: 260 }), withTiming(12, { duration: 260 })), -1, true);
      s.value = 1;
    }
  }, [mood, key, calm]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: `${r.value}deg` }, { scale: s.value }] }));
}

/** Slow floating decoration (clouds, leaves) for backgrounds — a looping CSS animation. */
const FLOAT = (amp: number) => ({
  from: { transform: [{ translateY: -amp }, { rotate: '-3deg' }] },
  to: { transform: [{ translateY: amp }, { rotate: '3deg' }] },
});
export function Floaty({ children, amp = 8, period = 3200, delay = 0, style }: { children: React.ReactNode; amp?: number; period?: number; delay?: number; style?: object }) {
  const calm = useCalm();
  const anim = useMemo(() => FLOAT(amp), [amp]);
  return (
    <Animated.View pointerEvents="none" style={[style, calm ? null : ({ animationName: anim, animationDuration: period, animationDelay: delay, animationIterationCount: 'infinite', animationDirection: 'alternate', animationTimingFunction: 'ease-in-out' } as never)]}>
      {children}
    </Animated.View>
  );
}

/** Call `onEnd` after a delay (for sequencing celebrations). */
export function useAfter(ms: number, onEnd: () => void, deps: unknown[] = []) {
  useEffect(() => {
    const id = setTimeout(onEnd, ms);
    return () => clearTimeout(id);
  }, deps);
}

/** Text that types itself out (Tingo's speech bubbles). */
export function Typewriter({ text, speed = 28, style, v = 'caption', center }: { text: string; speed?: number; style?: object; v?: 'caption' | 'callout' | 'body'; center?: boolean }) {
  const calm = useCalm();
  const [n, setN] = useState(calm ? text.length : 0);
  useEffect(() => {
    if (calm) { setN(text.length); return; }
    setN(0);
    const id = setInterval(() => setN((k) => { if (k >= text.length) { clearInterval(id); return k; } return k + 1; }), speed);
    return () => clearInterval(id);
  }, [text, calm]);
  return (
    <View>
      {/* invisible full text keeps the bubble from jumping while typing */}
      <Txt v={v} center={center} style={[style, { opacity: 0 }]}>{text}</Txt>
      <Txt v={v} center={center} style={[style, { position: 'absolute', left: 0, right: 0 }]}>{text.slice(0, n)}</Txt>
    </View>
  );
}

export { runOnJS };

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, left: 0 },
  burst: { position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute' },
});
