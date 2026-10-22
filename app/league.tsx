import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from '../src/components/icons';
import { Txt, Avatar, Segmented } from '../src/components/ui';
import { Flame } from '../src/components/Flame';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { useNet } from '../src/lib/queries';
import { leaderboard, tierFor, TIERS } from '../src/lib/league';
import { visibleStreak, type FlameId } from '../src/lib/streak';
import { goBack } from '../src/lib/nav';
import { weekKey } from '../src/store/useApp';

/** Days left until the league resets (Monday 00:00 local). */
const daysLeft = () => {
  const d = new Date();
  return ((8 - (d.getDay() || 7)) % 7) || 7;
};

export default function League() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<'all' | 'friends'>('all');
  const status = useNet((s) => s.status);
  const uid = useNet((s) => s.uid);
  const week = useApp((s) => s.weekXp);
  const myXp = week.week === weekKey() ? week.xp : 0;
  const tier = tierFor(myXp);
  const next = TIERS.find((x) => x.min > myXp);
  const q = useQuery({ queryKey: ['league', scope, weekKey()], queryFn: () => leaderboard(scope), enabled: status === 'ok' });
  const myRank = useMemo(() => (q.data ? q.data.findIndex((r) => r.user_id === uid) + 1 : 0), [q.data, uid]);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <LinearGradient colors={[tier.color, c.background]} locations={[0, 1]} style={{ paddingTop: insets.top, paddingBottom: space.m }}>
        <View style={styles.bar}>
          <Pressable onPress={() => goBack('/(tabs)/learn')} hitSlop={12} style={styles.back}><ArrowLeft size={20} color="#fff" /></Pressable>
        </View>
        <View style={{ alignItems: 'center', paddingHorizontal: space.l }}>
          <Animated.Text entering={ZoomIn.springify().damping(9)} style={{ fontSize: 64 }}>{tier.emoji}</Animated.Text>
          <Txt style={{ fontFamily: fonts.serif, fontSize: 40, lineHeight: 44, color: c.text, marginTop: 4 }}>{t(`league.tiers.${tier.id}`)}</Txt>
          <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 4 }}>
            {t('league.myXp', { n: myXp })}{myRank ? ` · ${t('league.rank', { n: myRank })}` : ''}
          </Txt>
          <Txt v="caption" color={c.textTertiary} style={{ marginTop: 4 }}>
            {next ? t('league.toNext', { n: next.min - myXp, tier: t(`league.tiers.${next.id}`) }) : t('league.top')} · {t('league.ends', { n: daysLeft() })}
          </Txt>
        </View>
      </LinearGradient>
      <View style={{ paddingHorizontal: space.m, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <Segmented value={scope} onChange={setScope} options={[{ value: 'all', label: t('league.all') }, { value: 'friends', label: t('league.friends') }]} />
      </View>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(r) => r.user_id}
        contentContainerStyle={{ padding: space.m, paddingBottom: insets.bottom + 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}
        ListEmptyComponent={
          <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 40 }}>
            {status !== 'ok' ? t('social.offline') : q.isLoading ? '…' : scope === 'friends' ? t('league.noFriends') : t('league.empty')}
          </Txt>
        }
        renderItem={({ item, index }) => {
          const me = item.user_id === uid;
          const p = item.profile;
          const streak = p ? visibleStreak({ count: p.streak ?? 0, last: p.streak_day ?? undefined }) : 0;
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 30)}>
              <Pressable
                onPress={() => p && router.push({ pathname: '/user/[id]', params: { id: p.id } })}
                style={[styles.row, { backgroundColor: me ? c.accentSoft : 'transparent', borderColor: c.divider }]}
              >
                <Txt style={{ width: 30, fontFamily: fonts.semibold, fontSize: 16, color: index < 3 ? '#E8A10C' : c.textTertiary }}>
                  {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                </Txt>
                <Avatar seed={item.user_id} size={40} label={p?.name || p?.handle} uri={p?.avatar_url} />
                <View style={{ flex: 1 }}>
                  <Txt v="bodyMedium" numberOfLines={1}>{p?.name || p?.handle || '—'}{me ? ` · ${t('common.you')}` : ''}</Txt>
                  {streak > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Flame size={11} skin={(p?.flame as FlameId) ?? 'classic'} animate={false} />
                      <Txt v="caption" color={c.textSecondary}>{streak}</Txt>
                    </View>
                  )}
                </View>
                <Txt v="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>{item.xp} ✦</Txt>
              </Pressable>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 52, justifyContent: 'center', paddingHorizontal: 16 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,.25)', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10, borderRadius: radius.m, borderBottomWidth: StyleSheet.hairlineWidth },
});
