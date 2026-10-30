import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Avatar, Txt } from './ui';
import { EmojiArt } from './NoteBits';
import { Floaty } from './Fx';
import { FoxArt } from './PathBits';
import { fonts, radius } from '../theme/tokens';
import { translate, translateArr, useT } from '../i18n';
import type { LangCode } from '../data/languages';
import { BOTS, JOURNEY_GOALS, TEAM_COLORS, type Card } from '../lib/arena';
import { useApp } from '../store/useApp';

/** "The Thunder Foxes" / «Лиси «Грім»» — pack names come from two fixed word lists. */
export function teamName(code: LangCode, a: number, b: number) {
  const A = translateArr(code, 'teams.a');
  const B = translateArr(code, 'teams.b');
  return translate(code, 'teams.nameFmt', { a: A[a % A.length] ?? '', b: B[b % B.length] ?? '' });
}
export const teamColor = (i: number) => TEAM_COLORS[i % TEAM_COLORS.length];

/** A pack's round badge: mascot emoji on its colour. */
export function TeamBadge({ emoji, color, size = 48 }: { emoji: string; color: number; size?: number }) {
  const bg = teamColor(color);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,.18)' }}>
      <EmojiArt emoji={emoji} size={size * 0.62} />
    </View>
  );
}

/** A player's face: their avatar, or the animal of a practice bot. */
export function PlayerFace({ card, botId, size = 44, me }: { card?: Card | null; botId?: string; size?: number; me?: boolean }) {
  const look = useApp((s) => s.foxLook);
  const bot = BOTS.find((b) => b.id === botId);
  if (bot) {
    return <View style={[styles.face, { width: size, height: size, borderRadius: size / 2 }]}><EmojiArt emoji={bot.emoji} size={size * 0.7} /></View>;
  }
  if (me && !card?.avatar_url) {
    return <View style={[styles.face, { width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFEDD5' }]}><FoxArt size={size * 0.72} look={look} /></View>;
  }
  return <Avatar seed={card?.id ?? 'x'} uri={card?.avatar_url} label={card?.name || card?.handle || '?'} size={size} />;
}

/** Tingo walking a country's route; every stop is a chest for everyone. */
export function JourneyRoute({ stops, xp, claimable, onClaim, width }: { stops: string[]; xp: number; claimable: (i: number) => boolean; onClaim: (i: number) => void; width: number }) {
  const look = useApp((s) => s.foxLook);
  const H = 92;
  const pts = useMemo(() => {
    const n = stops.length + 1; // start + stops
    return Array.from({ length: n }, (_, i) => ({ x: 22 + (i * (width - 44)) / (n - 1), y: i % 2 ? 26 : 66 }));
  }, [width, stops.length]);
  // fractional position along the route
  let pos = 0;
  for (let i = 0; i < JOURNEY_GOALS.length; i++) {
    const prev = i ? JOURNEY_GOALS[i - 1] : 0;
    if (xp >= JOURNEY_GOALS[i]) pos = i + 1;
    else { pos = i + Math.max(0, (xp - prev) / (JOURNEY_GOALS[i] - prev)); break; }
  }
  const k = Math.min(Math.floor(pos), pts.length - 2);
  const f = Math.min(1, pos - k);
  const fox = pos >= pts.length - 1 ? pts[pts.length - 1] : { x: pts[k].x + (pts[k + 1].x - pts[k].x) * f, y: pts[k].y + (pts[k + 1].y - pts[k].y) * f };
  const d = pts.map((p, i) => (i ? `Q ${(pts[i - 1].x + p.x) / 2} ${i % 2 ? p.y - 22 : p.y + 22} ${p.x} ${p.y}` : `M ${p.x} ${p.y}`)).join(' ');
  return (
    <View style={{ height: H + 18, width }}>
      <Svg width={width} height={H} style={StyleSheet.absoluteFill}>
        <Path d={d} stroke="rgba(255,255,255,.55)" strokeWidth={4} strokeDasharray="2 9" strokeLinecap="round" fill="none" />
      </Svg>
      {pts.slice(1).map((p, i) => {
        const reached = xp >= JOURNEY_GOALS[i];
        const chest = reached && claimable(i);
        return (
          <Pressable key={i} disabled={!chest} onPress={() => onClaim(i)} hitSlop={8}
            style={[styles.stop, { left: p.x - 21, top: p.y - 21, backgroundColor: reached ? '#fff' : 'rgba(255,255,255,.22)', borderColor: chest ? '#FDE047' : 'transparent' }]}>
            {chest ? <Floaty amp={3} period={700}><EmojiArt emoji="🎁" size={26} /></Floaty> : <View style={{ opacity: reached ? 1 : 0.55 }}><EmojiArt emoji={stops[i]} size={24} /></View>}
            <Txt style={styles.goal}>{JOURNEY_GOALS[i] >= 1000 ? `${JOURNEY_GOALS[i] / 1000}k` : JOURNEY_GOALS[i]}</Txt>
          </Pressable>
        );
      })}
      <View style={[styles.start, { left: pts[0].x - 7, top: pts[0].y - 7 }]} />
      <Animated.View entering={ZoomIn.delay(200)} style={{ position: 'absolute', left: fox.x - 20, top: fox.y - 46 }}>
        <Floaty amp={4} period={900}><FoxArt size={40} look={look} /></Floaty>
      </Animated.View>
    </View>
  );
}

/** Coloured hero card used for the arena modes. */
export function ModeHero({ colors, emoji, title, sub, children, floaters }: { colors: [string, string, ...string[]]; emoji: string; title: string; sub?: string; children?: React.ReactNode; floaters?: string[] }) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      {floaters && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {floaters.map((e, i) => (
            <Floaty key={i} amp={8} period={2400 + i * 500} delay={i * 300} style={{ position: 'absolute', opacity: 0.18, top: 6 + (i * 37) % 70, right: 8 + i * 46 }}>
              <EmojiArt emoji={e} size={34 + (i % 2) * 12} />
            </Floaty>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={styles.heroIcon}><EmojiArt emoji={emoji} size={34} /></View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontFamily: fonts.semibold, fontSize: 20, color: '#fff' }}>{title}</Txt>
          {sub ? <Txt v="caption" color="rgba(255,255,255,.85)" style={{ marginTop: 2 }}>{sub}</Txt> : null}
        </View>
      </View>
      {children}
    </LinearGradient>
  );
}

/** Small white pill button for coloured cards. */
export function GlassButton({ title, onPress, icon }: { title: string; onPress: () => void; icon?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.glass, { opacity: pressed ? 0.75 : 1 }]} accessibilityRole="button">
      {icon}
      <Txt style={{ fontFamily: fonts.semibold, fontSize: 14, color: '#fff' }}>{title}</Txt>
    </Pressable>
  );
}

export function useArenaT() {
  const { t, code } = useT();
  return { t, code };
}

const styles = StyleSheet.create({
  face: { backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  stop: { position: 'absolute', width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  goal: { position: 'absolute', bottom: -18, fontFamily: fonts.semibold, fontSize: 10, color: 'rgba(255,255,255,.9)' },
  start: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff' },
  hero: { borderRadius: radius.xl, padding: 18, overflow: 'hidden' },
  heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center' },
  glass: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,.35)' },
});
