import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Check, ChevronRight } from './icons';
import { Txt, ProgressBar } from './ui';
import { EmojiArt } from './NoteBits';
import { Sheet, toast } from './Overlay';
import { useTheme, radius } from '../theme/tokens';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';
import { questsFor, CHEST_REWARD, CHEST_CRYSTALS_DAILY } from '../lib/quests';
import { dateKey } from '../data/social';
import { haptic } from '../lib/feedback';

/** Today's quests: progress per quest and the chest once all three are done. */
export function useQuests() {
  const q = useApp((s) => s.quests);
  const day = dateKey();
  const today = q.day === day ? q : { day, claimed: [] as string[] };
  const list = questsFor(day).map((x) => {
    const n = Math.min(x.goal, (today as unknown as Record<string, number>)[x.field] ?? 0);
    return { ...x, n, done: n >= x.goal, claimed: today.claimed.includes(x.id) };
  });
  const allClaimed = list.every((x) => x.claimed);
  return { list, done: list.filter((x) => x.done).length, chestReady: allClaimed && !today.claimed.includes('chest'), chestOpen: today.claimed.includes('chest') };
}

/** Slim strip on the path: three dots and a chest; opens the full list. */
export function QuestStrip() {
  const { c } = useTheme();
  const { t } = useT();
  const q = useQuests();
  const [open, setOpen] = useState(false);
  const ready = q.list.some((x) => x.done && !x.claimed) || q.chestReady;
  return (
    <>
      <Pressable onPress={() => { haptic.light(); setOpen(true); }} style={[styles.strip, { backgroundColor: c.surface, borderColor: ready ? '#F59E0B' : c.divider }]} accessibilityLabel={t('quests.title')}>
        <EmojiArt emoji={q.chestOpen ? '🏆' : '🎁'} size={24} />
        <Txt v="captionMedium" style={{ flex: 1 }} numberOfLines={1}>{q.chestOpen ? t('quests.allDone') : t('quests.title')}</Txt>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {q.list.map((x) => <View key={x.id} style={[styles.dot, { backgroundColor: x.done ? '#2FB574' : c.divider }]} />)}
        </View>
        {ready ? <View style={styles.badge}><Txt v="overline" color="#fff">{t('quests.claim')}</Txt></View> : <ChevronRight size={16} color={c.textTertiary} />}
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('quests.title')}>
        <QuestList />
      </Sheet>
    </>
  );
}

export function QuestList() {
  const { c } = useTheme();
  const { t } = useT();
  const q = useQuests();
  const claim = (id: string) => {
    const n = useApp.getState().claimQuest(id);
    if (!n) return;
    haptic.success();
    toast(id === 'chest' ? t('quests.chestGot', { n, c: CHEST_CRYSTALS_DAILY }) : t('quests.claimed', { n }), 'success');
  };
  return (
    <View style={{ gap: 10, paddingBottom: 8 }}>
      {q.list.map((x, i) => (
        <Animated.View key={x.id} entering={FadeInDown.delay(i * 60)} style={[styles.row, { backgroundColor: c.surfaceAlt }]}>
          <EmojiArt emoji={x.emoji} size={32} />
          <View style={{ flex: 1, gap: 6 }}>
            <Txt v="bodyMedium">{t(`quests.items.${x.id}`, { n: x.goal })}</Txt>
            <ProgressBar value={x.n / x.goal} color={x.done ? '#2FB574' : '#F59E0B'} height={8} />
            <Txt v="caption" color={c.textSecondary}>{x.n} / {x.goal}</Txt>
          </View>
          {x.claimed ? (
            <View style={[styles.done, { backgroundColor: '#2FB574' }]}><Check size={16} color="#fff" strokeWidth={3} /></View>
          ) : x.done ? (
            <Pressable onPress={() => claim(x.id)} style={[styles.claim, { backgroundColor: '#F59E0B' }]}><Txt v="captionMedium" color="#fff">+{x.reward}</Txt></Pressable>
          ) : (
            <Txt v="captionMedium" color={c.textTertiary}>+{x.reward}</Txt>
          )}
        </Animated.View>
      ))}
      <Animated.View entering={ZoomIn.delay(250)}>
        <Pressable onPress={() => q.chestReady && claim('chest')} style={[styles.chest, { backgroundColor: q.chestReady ? '#F59E0B' : c.surfaceAlt, opacity: q.chestOpen ? 0.6 : 1 }]}>
          <EmojiArt emoji={q.chestOpen ? '🏆' : '🎁'} size={40} />
          <View style={{ flex: 1 }}>
            <Txt v="bodyMedium" color={q.chestReady ? '#fff' : c.text}>{q.chestOpen ? t('quests.chestOpened') : t('quests.chestTitle')}</Txt>
            <Txt v="caption" color={q.chestReady ? 'rgba(255,255,255,.9)' : c.textSecondary}>{t('quests.chestSub', { n: CHEST_REWARD, c: CHEST_CRYSTALS_DAILY })}</Txt>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingHorizontal: 12, height: 44, borderRadius: radius.m, borderWidth: 1.5, maxWidth: 560, width: '100%', alignSelf: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.m },
  done: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  claim: { paddingHorizontal: 12, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chest: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.m },
});
