import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut, FadeOutUp, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Share2, Snowflake, Sparkle, Gem } from './icons';
import { Txt, Button, PressableScale } from './ui';
import { Flame } from './Flame';
import { toast } from './Overlay';
import { useTheme, fonts, radius } from '../theme/tokens';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';
import { FLAMES, FlameId, visibleStreak, doneToday } from '../lib/streak';
import { shareStreak } from '../lib/shareStreak';
import { MaxPill } from './MaxLock';
import { haptic } from '../lib/feedback';
import { Confetti } from './Fx';
import { ChunkyButton, Mascot } from './PathBits';

/** The picture people share: gradient, flame, big number. Also captured as PNG on native. */
export const StreakCard = forwardRef<any, { count: number; flame: FlameId; words: number; width: number }>(({ count, flame, words, width }, ref) => {
  const { t } = useT();
  const h = width * 1.25;
  return (
    <ViewShot ref={ref} options={{ format: 'png', quality: 1 }} style={{ width, height: h, borderRadius: 28, overflow: 'hidden' }}>
      <LinearGradient colors={FLAMES[flame].card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', top: h * 0.1, width: width * 0.9, height: width * 0.9, borderRadius: width, backgroundColor: 'rgba(255,255,255,.14)' }} />
        <Flame size={width * 0.3} colors={['#FFFFFF', FLAMES[flame].colors[1]]} />
        <Txt style={{ fontFamily: fonts.serif, fontSize: width * 0.3, lineHeight: width * 0.34, color: '#fff', marginTop: 4 }}>{count}</Txt>
        <Txt style={{ fontFamily: fonts.semibold, fontSize: width * 0.055, color: '#fff' }}>{t('streak.shareCard')}</Txt>
        <Txt style={{ fontFamily: fonts.medium, fontSize: width * 0.04, color: 'rgba(255,255,255,.8)', marginTop: 6 }}>{t('streak.cardWords', { n: words })}</Txt>
        <Txt style={{ position: 'absolute', bottom: h * 0.05, fontFamily: fonts.serif, fontSize: width * 0.065, color: '#fff' }}>Thingual</Txt>
      </LinearGradient>
    </ViewShot>
  );
});

export function useShareStreak() {
  const { t } = useT();
  const ref = useRef<any>(null);
  const share = async (count: number) => {
    const s = useApp.getState();
    const r = await shareStreak({
      count, flame: s.flame, words: Object.keys(s.words).length,
      text: t('streak.shareText', { n: count }), caption: t('streak.shareCard'), wordsLabel: t('streak.cardWords', { n: Object.keys(s.words).length }),
      capture: async () => ref.current?.capture?.(),
    });
    if (r === 'copied') toast(t('streak.copied'), 'success');
  };
  return { ref, share };
}

/** Small pills for headers: flame + streak, sparks. */
export function StreakPills({ compact }: { compact?: boolean } = {}) {
  const { c } = useTheme();
  const st = useApp((s) => s.learnStreak);
  const sparks = useApp((s) => s.sparks);
  const crystals = useApp((s) => s.crystals);
  const n = visibleStreak(st);
  const done = doneToday(st);
  const narrow = useWindowDimensions().width < 360;
  const pad = narrow ? { paddingHorizontal: 8 } : null;
  return (
    <View style={{ flexDirection: 'row', gap: narrow ? 5 : 8, alignItems: 'center' }}>
      <MaxPill compact />
      <PressableScale onPress={() => router.push('/streak')} style={[styles.pill, pad, { backgroundColor: c.surface, borderColor: c.divider }]} accessibilityLabel="streak">
        <Flame size={16} active={done} animate={false} />
        <Txt v="captionMedium" style={{ fontVariant: ['tabular-nums'] }}>{n}</Txt>
      </PressableScale>
      <PressableScale onPress={() => router.push('/crystals')} style={[styles.pill, pad, { backgroundColor: c.surface, borderColor: c.divider }]} accessibilityLabel="crystals">
        <Gem size={15} color="#7C5CFF" fill="#C4B5FD" />
        <Txt v="captionMedium" style={{ fontVariant: ['tabular-nums'] }}>{crystals}</Txt>
      </PressableScale>
      {!narrow && !compact && (
        <PressableScale onPress={() => router.push('/shop')} style={[styles.pill, pad, { backgroundColor: c.surface, borderColor: c.divider }]} accessibilityLabel="sparks">
          <Sparkle size={15} color="#F59F00" fill="#F59F00" />
          <Txt v="captionMedium" style={{ fontVariant: ['tabular-nums'] }}>{sparks}</Txt>
        </PressableScale>
      )}
    </View>
  );
}

/** Global: a banner for a new streak day, a full-screen moment for milestones. */
export function StreakCelebration() {
  const cel = useApp((s) => s.celebrate);
  const clear = useApp((s) => s.clearCelebrate);
  if (!cel) return null;
  return cel.kind === 'daily' ? <DailyBanner key={cel.at} count={cel.count} sparks={cel.sparks} onDone={clear} /> : <Milestone key={cel.at} days={cel.days} reward={cel.reward} onDone={clear} />;
}

function DailyBanner({ count, sparks, onDone }: { count: number; sparks: number; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  useEffect(() => {
    haptic.success();
    const id = setTimeout(onDone, 3200);
    return () => clearTimeout(id);
  }, []);
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { alignItems: 'center' }]}>
      <Animated.View entering={FadeInUp.springify().damping(16)} exiting={FadeOutUp.duration(200)} style={{ marginTop: insets.top + 8 }}>
        <Pressable onPress={() => { onDone(); router.push('/streak'); }} style={styles.banner}>
          <Animated.View entering={ZoomIn.delay(120).springify().damping(9)}>
            <Flame size={26} />
          </Animated.View>
          <Txt v="captionMedium" color="#fff" style={{ fontSize: 14 }}>{t('streak.dailyToast', { n: count, s: sparks })}</Txt>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function Spark({ i }: { i: number }) {
  const v = useSharedValue(0);
  const angle = (i / 14) * Math.PI * 2;
  const dist = 110 + (i % 3) * 30;
  useEffect(() => {
    v.value = withDelay(250 + (i % 5) * 40, withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }), withTiming(0, { duration: 0 })), 2));
  }, []);
  const st = useAnimatedStyle(() => ({
    opacity: v.value === 0 ? 0 : 1 - v.value,
    transform: [{ translateX: Math.cos(angle) * dist * v.value }, { translateY: Math.sin(angle) * dist * v.value - 40 }, { scale: 0.6 + v.value * 0.6 }],
  }));
  return <Animated.View style={[{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: i % 2 ? '#FFC94D' : '#FF6B35' }, st]} />;
}

function Milestone({ days, reward, onDone }: { days: number; reward: { sparks?: number; freezes?: number; flame?: FlameId }; onDone: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { ref, share } = useShareStreak();
  const flame = useApp((s) => s.flame);
  const words = useApp((s) => Object.keys(s.words).length);
  const [cardShown] = useState(Platform.OS !== 'web');
  useEffect(() => haptic.success(), []);
  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: 24, paddingBottom: insets.bottom + 24 }]}>
      <LinearGradient colors={['#FFF4E0', '#FFD6A5', '#FFB4A2']} style={StyleSheet.absoluteFill} />
      <Confetti count={90} />
      {/* off-screen card for native image capture */}
      {cardShown && (
        <View style={{ position: 'absolute', left: -2000 }} pointerEvents="none">
          <StreakCard ref={ref} count={days} flame={flame} words={words} width={360} />
        </View>
      )}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {Array.from({ length: 14 }, (_, i) => <Spark key={i} i={i} />)}
        <Animated.View entering={ZoomIn.springify().damping(8).stiffness(120)}>
          <Flame size={120} />
        </Animated.View>
        <View style={{ position: 'absolute', right: -92, bottom: -10 }}><Mascot size={84} mood="dance" tappable={false} /></View>
      </View>
      <Animated.View entering={FadeInDown.delay(250)}>
        <Txt style={{ fontFamily: fonts.serif, fontSize: 64, lineHeight: 70, color: '#3B1D0B', textAlign: 'center', marginTop: 8 }}>{t('streak.milestoneTitle', { n: days })}</Txt>
        <Txt v="callout" color="#7A4A2A" center style={{ marginTop: 4, maxWidth: 320 }}>{t('streak.milestoneSub')}</Txt>
      </Animated.View>
      <View style={{ gap: 8, marginTop: 20, width: '100%', maxWidth: 360 }}>
        {reward.sparks ? <RewardRow i={0} icon={<Sparkle size={18} color="#F59F00" fill="#F59F00" />} label={t('streak.rewardSparks', { n: reward.sparks })} /> : null}
        {reward.freezes ? <RewardRow i={1} icon={<Snowflake size={18} color="#3B82F6" />} label={t('streak.rewardFreezes', { n: reward.freezes })} /> : null}
        {reward.flame ? <RewardRow i={2} icon={<Flame size={18} skin={reward.flame} animate={false} />} label={t('streak.rewardFlame', { name: t(`shop.flameNames.${reward.flame}`) })} /> : null}
      </View>
      <View style={{ width: '100%', maxWidth: 360, gap: 10, marginTop: 28 }}>
        <ChunkyButton title={t('streak.continue')} color="#F97316" onPress={onDone} />
        <Button title={t('streak.share')} variant="secondary" icon={<Share2 size={18} color={c.text} />} onPress={() => share(days)} />
      </View>
    </Animated.View>
  );
}

function RewardRow({ icon, label, i }: { icon: React.ReactNode; label: string; i: number }) {
  const { c } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(450 + i * 120).springify()} style={[styles.reward, { backgroundColor: c.surface, borderColor: c.divider }]}>
      {icon}
      <Txt v="bodyMedium">{label}</Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 11, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#141414', paddingLeft: 12, paddingRight: 18, paddingVertical: 8, borderRadius: 999, boxShadow: '0 8px 24px rgba(0,0,0,.25)' },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth },
});
