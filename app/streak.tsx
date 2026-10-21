import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Share2, Snowflake, Sparkle, X } from '../src/components/icons';
import { Txt, Button, PressableScale, ProgressBar } from '../src/components/ui';
import { Flame } from '../src/components/Flame';
import { StreakCard, useShareStreak } from '../src/components/StreakBits';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { dateKey } from '../src/data/social';
import { addDays, dayDiff, doneToday, FLAMES, MAX_FREEZES, MILESTONES, nextMilestone, prevMilestone, REPAIR_WINDOW, visibleStreak } from '../src/lib/streak';

export default function StreakScreen() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const ui = useApp((s) => s.settings.uiLang);
  const st = useApp((s) => s.learnStreak);
  const best = useApp((s) => s.bestStreak);
  const freezes = useApp((s) => s.freezes);
  const sparks = useApp((s) => s.sparks);
  const activeDays = useApp((s) => s.activeDays);
  const frozenDays = useApp((s) => s.frozenDays);
  const claimed = useApp((s) => s.claimed);
  const lost = useApp((s) => s.lostStreak);
  const flame = useApp((s) => s.flame);
  const words = useApp((s) => Object.keys(s.words).length);
  const { ref, share } = useShareStreak();

  const today = dateKey();
  const n = visibleStreak(st);
  const done = doneToday(st);
  const next = nextMilestone(n);
  const prev = prevMilestone(n);
  const active = useMemo(() => new Set(activeDays), [activeDays]);
  const frozen = useMemo(() => new Set(frozenDays), [frozenDays]);
  const tint = FLAMES[flame].colors[0];

  // Monday-based week
  const week = useMemo(() => {
    const d = new Date();
    const offset = (d.getDay() + 6) % 7;
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDays(today, i - offset);
      const date = new Date(Date.now() + (i - offset) * 86400000);
      return { key, label: date.toLocaleDateString(ui, { weekday: 'short' }).slice(0, 2) };
    });
  }, [today, ui]);

  const month = useMemo(() => {
    const d = new Date();
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const daysIn = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7;
    const cells: ({ key: string; day: number } | null)[] = Array(lead).fill(null);
    for (let i = 1; i <= daysIn; i++) cells.push({ key: dateKey(new Date(d.getFullYear(), d.getMonth(), i, 12)), day: i });
    while (cells.length % 7) cells.push(null);
    return { cells, title: d.toLocaleDateString(ui, { month: 'long', year: 'numeric' }) };
  }, [today, ui]);

  const repairLeft = lost ? REPAIR_WINDOW - dayDiff(lost.day, today) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={12}><X size={22} color={c.text} /></Pressable>
        <Txt v="headline" style={{ flex: 1, textAlign: 'center' }}>{t('streak.title')}</Txt>
        <PressableScale onPress={() => router.push('/shop')} style={[styles.pill, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <Sparkle size={15} color="#F59F00" fill="#F59F00" />
          <Txt v="captionMedium">{sparks}</Txt>
        </PressableScale>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.m, paddingBottom: insets.bottom + 40, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        {/* hero */}
        <View style={{ alignItems: 'center', paddingVertical: space.m }}>
          <Animated.View entering={ZoomIn.springify().damping(10)}>
            <Flame size={96} active={done} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(120)} style={{ alignItems: 'center' }}>
            <Txt style={{ fontFamily: fonts.serif, fontSize: 92, lineHeight: 98, color: done ? c.text : c.textSecondary }}>{n}</Txt>
            <Txt v="bodyMedium" style={{ marginTop: -6 }}>{t('streak.days')}</Txt>
            <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 10, maxWidth: 320 }}>{done ? t('streak.doneToday') : t('streak.keepAlive')}</Txt>
            {best > 0 && <Txt v="caption" color={c.textTertiary} style={{ marginTop: 6 }}>{t('streak.best', { n: best })}</Txt>}
          </Animated.View>
        </View>

        {lost && repairLeft >= 0 && (
          <Animated.View entering={FadeInDown} style={[styles.card, { backgroundColor: c.dropSoft, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={{ flex: 1 }}>
              <Txt v="bodyMedium">{t('streak.lost', { n: lost.count })}</Txt>
              <Txt v="caption" color={c.textSecondary}>{t('streak.lostSub', { d: Math.max(1, repairLeft) })}</Txt>
            </View>
            <Button title={t('streak.repairCta')} variant="drop" size="m" onPress={() => router.push('/shop')} />
          </Animated.View>
        )}

        {/* week */}
        <Animated.View entering={FadeInDown.delay(180)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {week.map((d) => {
              const on = active.has(d.key);
              const fz = frozen.has(d.key);
              const isToday = d.key === today;
              const future = d.key > today;
              return (
                <View key={d.key} style={{ alignItems: 'center', gap: 6 }}>
                  <Txt v="caption" color={isToday ? c.text : c.textTertiary}>{d.label}</Txt>
                  <View style={[styles.dot, {
                    backgroundColor: on ? tint : fz ? '#DBEAFE' : 'transparent',
                    borderColor: on ? tint : fz ? '#93C5FD' : isToday ? c.text : c.divider,
                    opacity: future ? 0.5 : 1,
                  }]}>
                    {on ? <Check size={16} color="#fff" strokeWidth={3} /> : fz ? <Snowflake size={15} color="#3B82F6" /> : null}
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* freezes */}
        <Animated.View entering={FadeInDown.delay(240)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt v="bodyMedium">{t('streak.freezes')}</Txt>
              <Txt v="caption" color={c.textSecondary}>{t('streak.freezesSub')}</Txt>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {Array.from({ length: Math.max(MAX_FREEZES, freezes) }, (_, i) => (
                <View key={i} style={[styles.freeze, { backgroundColor: i < freezes ? '#DBEAFE' : c.surfaceAlt }]}>
                  <Snowflake size={16} color={i < freezes ? '#3B82F6' : c.textTertiary} />
                </View>
              ))}
            </View>
          </View>
          {freezes < MAX_FREEZES && (
            <Button title={t('shop.title')} variant="secondary" size="m" style={{ marginTop: 12 }} onPress={() => router.push('/shop')} />
          )}
        </Animated.View>

        {/* milestones */}
        <Animated.View entering={FadeInDown.delay(300)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <Txt v="overline" color={c.textSecondary}>{t('streak.milestones')}</Txt>
          <Txt v="bodyMedium" style={{ marginTop: 8 }}>{next ? t('streak.nextIn', { n: next.days - n }) : t('streak.allDone')}</Txt>
          {next && (
            <View style={{ marginTop: 10 }}>
              <ProgressBar value={(n - (prev?.days ?? 0)) / (next.days - (prev?.days ?? 0))} height={8} color={tint} />
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 14 }}>
            {MILESTONES.map((m) => {
              const got = claimed.includes(m.days);
              return (
                <View key={m.days} style={[styles.ms, { backgroundColor: got ? c.text : c.surfaceAlt }]}>
                  <Txt style={{ fontFamily: fonts.serif, fontSize: 28, lineHeight: 32, color: got ? c.background : c.text }}>{m.days}</Txt>
                  <Txt v="caption" color={got ? c.background : c.textSecondary} style={{ opacity: 0.8 }}>{t('streak.daysShort', { n: '' }).trim()}</Txt>
                  <View style={{ gap: 3, marginTop: 8, alignItems: 'center' }}>
                    {m.reward.sparks ? <Txt v="caption" color={got ? c.background : c.text}>✦ {m.reward.sparks}</Txt> : null}
                    {m.reward.freezes ? <Txt v="caption" color={got ? c.background : c.text}>❄ ×{m.reward.freezes}</Txt> : null}
                    {m.reward.flame ? <Flame size={14} skin={m.reward.flame} animate={false} /> : null}
                  </View>
                  {got && <Check size={14} color={c.background} style={{ position: 'absolute', top: 8, right: 8 }} />}
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* share */}
        <Animated.View entering={FadeInDown.delay(360)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider, alignItems: 'center' }]}>
          <StreakCard ref={ref} count={n} flame={flame} words={words} width={220} />
          <Button title={t('streak.share')} variant="drop" icon={<Share2 size={18} color="#fff" />} style={{ marginTop: 14, alignSelf: 'stretch' }} onPress={() => share(n)} />
        </Animated.View>

        {/* calendar */}
        <Animated.View entering={FadeInDown.delay(420)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <Txt v="bodyMedium" style={{ textTransform: 'capitalize', marginBottom: 10 }}>{month.title}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {month.cells.map((cell, i) => {
              if (!cell) return <View key={i} style={styles.cell} />;
              const on = active.has(cell.key);
              const fz = frozen.has(cell.key);
              const isToday = cell.key === today;
              return (
                <View key={i} style={styles.cell}>
                  <View style={[styles.cellIn, { backgroundColor: on ? tint : fz ? '#DBEAFE' : 'transparent', borderColor: isToday ? c.text : 'transparent' }]}>
                    <Txt v="caption" color={on ? '#fff' : fz ? '#3B82F6' : cell.key > today ? c.textTertiary : c.text}>{cell.day}</Txt>
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        <View style={[styles.card, { backgroundColor: 'transparent', borderColor: c.divider }]}>
          <Txt v="bodyMedium">{t('streak.howTo')}</Txt>
          <Txt v="caption" color={c.textSecondary} style={{ marginTop: 4 }}>{t('streak.howToBody')}</Txt>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52, gap: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 11, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
  card: { borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, padding: space.m, marginTop: 12 },
  dot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  freeze: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ms: { width: 76, borderRadius: radius.m, paddingVertical: 12, alignItems: 'center' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  cellIn: { flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
});
