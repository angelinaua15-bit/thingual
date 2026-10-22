import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Check, Gem, Gift, Timer } from './icons';
import { Txt, PressableScale, ProgressBar } from './ui';
import { toast } from './Overlay';
import { useTheme, radius } from '../theme/tokens';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';
import { dateKey } from '../data/social';
import { TIME_TIERS } from '../data/wordPacks';
import { haptic } from '../lib/feedback';

/** Today's learning time: crystals for every 2 minutes and a gift at 5 / 15 / 30 / 60 minutes. */
export function TimeCard({ compact }: { compact?: boolean }) {
  const { c } = useTheme();
  const { t } = useT();
  const raw = useApp((s) => s.timeToday);
  const today = raw.day === dateKey() ? raw : { day: '', seconds: 0, earned: 0, claimed: [] as number[] };
  const min = Math.floor(today.seconds / 60);
  const next = TIME_TIERS.find((x) => min < x.min);
  const prevMin = [...TIME_TIERS].reverse().find((x) => min >= x.min)?.min ?? 0;
  const progress = next ? (today.seconds / 60 - prevMin) / (next.min - prevMin) : 1;

  const claim = (m: number) => {
    const got = useApp.getState().claimTimeTier(m);
    if (got) {
      haptic.success();
      toast(t('cr.claimed', { n: got }), 'success');
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(120)}>
      <PressableScale onPress={() => !compact && router.push('/crystals')} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.ic, { backgroundColor: 'rgba(124,92,255,0.12)' }]}><Timer size={18} color="#7C5CFF" /></View>
          <View style={{ flex: 1 }}>
            <Txt v="bodyMedium">{t('cr.today', { n: min })}</Txt>
            <Txt v="caption" color={c.textSecondary}>{next ? t('cr.toNext', { n: Math.max(1, next.min - min), b: next.bonus }) : t('cr.allDone')}</Txt>
          </View>
          <View style={styles.earned}>
            <Gem size={14} color="#7C5CFF" fill="#C4B5FD" />
            <Txt v="captionMedium" color="#7C5CFF">+{today.earned}</Txt>
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <ProgressBar value={Math.min(1, Math.max(0, progress))} color="#7C5CFF" height={6} />
        </View>
        <View style={styles.tiers}>
          {TIME_TIERS.map((x) => {
            const reached = min >= x.min;
            const claimed = today.claimed.includes(x.min);
            const ready = reached && !claimed;
            return (
              <Pressable key={x.min} disabled={!ready} onPress={() => claim(x.min)} style={[styles.tier, { backgroundColor: ready ? '#7C5CFF' : claimed ? 'rgba(124,92,255,0.12)' : c.surfaceAlt }]} accessibilityLabel={`${x.min} min`}>
                {ready ? (
                  <Animated.View entering={ZoomIn.springify()}><Gift size={15} color="#fff" /></Animated.View>
                ) : claimed ? (
                  <Check size={14} color="#7C5CFF" />
                ) : null}
                <Txt v="captionMedium" color={ready ? '#fff' : claimed ? '#7C5CFF' : c.textSecondary}>{t('cr.min', { n: x.min })}</Txt>
                <Txt v="caption" color={ready ? 'rgba(255,255,255,.85)' : c.textTertiary} style={{ fontSize: 11 }}>+{x.bonus}</Txt>
              </Pressable>
            );
          })}
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12, padding: 16, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  ic: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  earned: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: 'rgba(124,92,255,0.12)' },
  tiers: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tier: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1, paddingVertical: 8, borderRadius: 14, flexDirection: 'column' },
});
