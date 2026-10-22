import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { ChevronRight } from './icons';
import { Txt, ProgressBar } from './ui';
import { toast } from './Overlay';
import { useTheme, radius } from '../theme/tokens';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';
import { questsFor, CHEST_REWARD } from '../lib/quests';
import { dateKey } from '../data/social';
import { emojiUrl } from '../data/emoji';
import { haptic } from '../lib/feedback';
import { tierFor } from '../lib/league';
import { weekKey } from '../store/useApp';

/** Three daily quests with spark rewards + a chest for finishing all, and the entry to the weekly league. */
export function QuestsCard() {
  const { c } = useTheme();
  const { t } = useT();
  const quests = useApp((s) => s.quests);
  const week = useApp((s) => s.weekXp);
  const day = dateKey();
  const list = questsFor(day);
  const q = quests.day === day ? quests : { day, claimed: [] as string[] };
  const done = list.filter((x) => q.claimed.includes(x.id)).length;
  const chestReady = done === list.length && !q.claimed.includes('chest');
  const xp = week.week === weekKey() ? week.xp : 0;
  const tier = tierFor(xp);

  const claim = (id: string) => {
    const r = useApp.getState().claimQuest(id);
    if (r) { haptic.success(); toast(t('quests.claimed', { n: r }), 'success'); }
  };

  return (
    <Animated.View entering={FadeInDown.delay(150)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Txt v="headline" style={{ flex: 1 }}>{t('quests.title')}</Txt>
        <Pressable onPress={() => router.push('/league')} style={[styles.league, { backgroundColor: c.surfaceAlt }]}>
          <Txt style={{ fontSize: 14 }}>{tier.emoji}</Txt>
          <Txt v="captionMedium">{xp} ✦</Txt>
          <ChevronRight size={14} color={c.textTertiary} />
        </Pressable>
      </View>
      <View style={{ gap: 12, marginTop: 12 }}>
        {list.map((quest) => {
          const val = Math.min((q as Record<string, unknown>)[quest.field] as number ?? 0, quest.goal);
          const complete = val >= quest.goal;
          const claimed = q.claimed.includes(quest.id);
          return (
            <View key={quest.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: claimed ? 0.55 : 1 }}>
              <View style={[styles.ic, { backgroundColor: c.surfaceAlt }]}><Image source={{ uri: emojiUrl(quest.emoji) }} style={{ width: 26, height: 26 }} /></View>
              <View style={{ flex: 1, gap: 6 }}>
                <Txt v="captionMedium">{t(`quests.items.${quest.id}`, { n: quest.goal })}</Txt>
                <ProgressBar value={val / quest.goal} height={6} color={complete ? c.success : c.accent} />
              </View>
              {complete && !claimed ? (
                <Pressable onPress={() => claim(quest.id)} style={[styles.claim, { backgroundColor: '#F59F00' }]}>
                  <Txt v="captionMedium" color="#fff">+{quest.reward} ✦</Txt>
                </Pressable>
              ) : (
                <Txt v="caption" color={c.textTertiary} style={{ minWidth: 48, textAlign: 'right' }}>{claimed ? '✓' : `${val}/${quest.goal}`}</Txt>
              )}
            </View>
          );
        })}
      </View>
      {chestReady && (
        <Animated.View entering={ZoomIn.springify()}>
          <Pressable onPress={() => claim('chest')} style={[styles.chest, { backgroundColor: c.ink }]}>
            <Image source={{ uri: emojiUrl('🎁') }} style={{ width: 30, height: 30 }} />
            <Txt v="bodyMedium" color={c.background} style={{ flex: 1 }}>{t('quests.chest', { n: CHEST_REWARD })}</Txt>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginTop: 12 },
  league: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 32, borderRadius: 999 },
  ic: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  claim: { paddingHorizontal: 10, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  chest: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.m, marginTop: 14 },
});
