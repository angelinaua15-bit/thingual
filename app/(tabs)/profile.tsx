import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Award, Bell, BookOpen, Camera, Flame, Globe2, Languages, Settings, Sparkles, Trophy, UserPlus } from '../../src/components/icons';
import { Screen, Txt, Button } from '../../src/components/ui';
import { ProfileView } from '../../src/components/ProfileView';
import { useTheme, fonts, radius, space, TAB_BAR_HEIGHT } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { useNet } from '../../src/lib/queries';
import { StreakPills } from '../../src/components/StreakBits';
import { visibleStreak } from '../../src/lib/streak';

const ACH = [
  { id: 'first-word', icon: BookOpen }, { id: '25-words', icon: Languages }, { id: '100-words', icon: Trophy }, { id: 'first-post', icon: Camera },
  { id: 'streak-7', icon: Flame }, { id: 'streak-30', icon: Flame }, { id: 'drop-30', icon: Sparkles }, { id: 'ten-countries', icon: Globe2 }, { id: 'five-langs', icon: Award },
];

export default function Profile() {
  const { c } = useTheme();
  const { t } = useT();
  const uid = useNet((s) => s.uid);
  const status = useNet((s) => s.status);
  const words = useApp((x) => x.words);
  const learnStreak = useApp((x) => x.learnStreak);
  const drops = useApp((x) => x.drops);
  const achievements = useApp((x) => x.achievements);

  const stats = (
    <Animated.View entering={FadeInDown.delay(120)} style={{ paddingHorizontal: space.m }}>
      <View style={[styles.stats, { backgroundColor: c.surface, borderColor: c.divider }]}>
        <Stat n={Object.keys(words).length} label={t('profile.words')} />
        <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: c.divider }} />
        <Stat n={visibleStreak(learnStreak)} label={t('profile.streak')} onPress={() => router.push('/streak')} />
        <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: c.divider }} />
        <Stat n={Object.keys(drops).length} label={t('profile.drops')} color={c.drop} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
        {ACH.map((a) => {
          const on = achievements.includes(a.id);
          const Icon = a.icon;
          return (
            <View key={a.id} style={[styles.ach, { backgroundColor: on ? c.text : c.surface, borderColor: c.divider, opacity: on ? 1 : 0.5 }]}>
              <Icon size={14} color={on ? c.background : c.textTertiary} />
              <Txt v="caption" color={on ? c.background : c.textSecondary}>{t(`profile.ach.${a.id}`)}</Txt>
            </View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );

  return (
    <Screen>
      <View style={styles.bar}>
        <Pressable onPress={() => router.push('/people')} hitSlop={10} accessibilityLabel={t('social.findPeople')}>
          <UserPlus size={22} color={c.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}><StreakPills /></View>
        <Pressable onPress={() => router.push('/activity')} hitSlop={10} accessibilityLabel={t('social.activity')}>
          <Bell size={22} color={c.text} />
        </Pressable>
        <Pressable onPress={() => router.push('/settings')} hitSlop={10} accessibilityLabel={t('profile.settings')}>
          <Settings size={22} color={c.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 40, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
        {uid ? (
          <ProfileView uid={uid} footer={<View style={{ marginTop: 18 }}>{stats}</View>} />
        ) : (
          <View style={{ padding: space.m, gap: 16 }}>
            {stats}
            <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 20 }}>{status === 'offline' ? t('social.offline') : '…'}</Txt>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Stat({ n, label, color, onPress }: { n: number; label: string; color?: string; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
      <Txt style={{ fontFamily: fonts.serif, fontSize: 30, color: color ?? c.text }}>{n}</Txt>
      <Txt v="caption" color={c.textSecondary}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 16, height: 48, maxWidth: 680, width: '100%', alignSelf: 'center' },
  stats: { flexDirection: 'row', borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  ach: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
});
