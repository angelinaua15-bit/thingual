import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronRight, Swords, UserPlus, Users } from '../../src/components/icons';
import { Txt, PressableScale, ProgressBar } from '../../src/components/ui';
import { EmojiArt } from '../../src/components/NoteBits';
import { ChunkyButton } from '../../src/components/PathBits';
import { ChestReward } from '../../src/components/Reward';
import { GlassButton, JourneyRoute, ModeHero, PlayerFace, TeamBadge, teamName } from '../../src/components/ArenaBits';
import { useTheme, radius, space, TAB_BAR_HEIGHT } from '../../src/theme/tokens';
import { useT, languageName } from '../../src/i18n';
import { useApp, weekKey } from '../../src/store/useApp';
import { useNet, connect } from '../../src/lib/queries';
import { JOURNEY_GOALS, JOURNEY_REWARD, journeyOfWeek, myDuels, myTeam, phraseText, teamGoal, voicesOf, worldWeek } from '../../src/lib/arena';

/** Arena: everything people do together — duels, packs, voice postcards and the world journey. */
export default function Arena() {
  const { c } = useTheme();
  const { t, code } = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = useApp((x) => x.settings);
  const weekXp = useApp((x) => (x.weekXp.week === weekKey() ? x.weekXp.xp : 0));
  const claimed = useApp((x) => x.path);
  const status = useNet((x) => x.status);
  const on = status === 'ok';
  const [reward, setReward] = useState(0);
  const lang = s.active;
  const week = weekKey();
  const trip = journeyOfWeek(week);

  const world = useQuery({ queryKey: ['world', week], queryFn: worldWeek, enabled: on, refetchInterval: 60_000 });
  const duels = useQuery({ queryKey: ['myDuels'], queryFn: myDuels, enabled: on });
  const team = useQuery({ queryKey: ['myTeam', week], queryFn: myTeam, enabled: on });
  const voices = useQuery({ queryKey: ['voices', lang], queryFn: () => voicesOf(lang), enabled: on });

  const cardW = Math.min(width, 680) - 32 - 36;
  const xp = Math.max(world.data?.xp ?? 0, weekXp);
  const stopKey = (i: number) => `arena:world:${week}:${i}`;
  const claim = (i: number) => {
    const n = useApp.getState().claimReward(stopKey(i), JOURNEY_REWARD);
    if (n) setReward(n);
  };
  const nextGoal = JOURNEY_GOALS.find((g) => g > xp);

  const finished = (duels.data ?? []).filter((d) => d.their_score != null);
  let streak = 0;
  for (const d of finished) { if (d.my_score > (d.their_score ?? 0)) streak++; else break; }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: TAB_BAR_HEIGHT + 40, paddingHorizontal: 16, gap: 14, maxWidth: 680, width: '100%', alignSelf: 'center' }}
        refreshControl={undefined}>
        <View style={{ marginTop: space.s }}>
          <Txt v="display">{t('arena.title')}</Txt>
          <Txt v="callout" color={c.textSecondary}>{t('arena.sub')}</Txt>
        </View>
        {status === 'offline' && (
          <Pressable onPress={() => connect()} style={[styles.offline, { backgroundColor: c.surfaceAlt }]}>
            <EmojiArt emoji="📡" size={22} />
            <Txt v="captionMedium" style={{ flex: 1 }}>{t('arena.offline')}</Txt>
            <Txt v="captionMedium" color={c.accent}>{t('arena.retry')}</Txt>
          </Pressable>
        )}

        {/* the whole world walks Tingo through one country a week */}
        <Animated.View entering={FadeInDown.duration(350)}>
          <ModeHero colors={['#0EA5E9', '#6366F1', '#8B5CF6']} emoji={trip.flag} title={t('arena.journeyTitle', { country: t(`journey.countries.${trip.id}`) })} sub={t('arena.journeySub')}>
            <View style={{ marginTop: 14 }}>
              <JourneyRoute stops={trip.stops} xp={xp} width={cardW} claimable={(i) => weekXp > 0 && !claimed[stopKey(i)]} onClaim={claim} />
            </View>
            <View style={styles.journeyFoot}>
              <Txt v="captionMedium" color="#fff">{nextGoal ? t('arena.journeyNext', { n: (nextGoal - xp).toLocaleString() }) : t('arena.journeyDone')}</Txt>
              <Txt v="caption" color="rgba(255,255,255,.8)">{t('arena.journeyPlayers', { n: Math.max(world.data?.players ?? 0, weekXp > 0 ? 1 : 0) })} · {t('arena.journeyMine', { n: weekXp })}</Txt>
            </View>
          </ModeHero>
        </Animated.View>

        {/* duels */}
        <Animated.View entering={FadeInDown.delay(80).duration(350)}>
          <ModeHero colors={['#F43F5E', '#F97316', '#F59E0B']} emoji="⚔️" title={t('arena.duelTitle')} sub={t('arena.duelSub')} floaters={['⚡', '🏆', '⭐']}>
            {streak >= 2 && <Txt v="captionMedium" color="#FEF3C7" style={{ marginTop: 10 }}>🔥 {t('arena.streak', { n: streak })}</Txt>}
            <View style={{ marginTop: 14 }}>
              <ChunkyButton title={t('arena.find')} color="#16A34A" onPress={() => router.push('/duel')} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <GlassButton title={t('arena.friend')} icon={<UserPlus size={16} color="#fff" />} onPress={() => router.push({ pathname: '/duel', params: { friend: '1' } })} />
            </View>
            {(duels.data?.length ?? 0) > 0 && (
              <View style={styles.recent}>
                <Txt v="overline" color="rgba(255,255,255,.8)">{t('arena.recent')}</Txt>
                {duels.data!.slice(0, 3).map((d) => {
                  const done = d.their_score != null;
                  const res = !done ? null : d.my_score > d.their_score! ? 'won' : d.my_score < d.their_score! ? 'lost' : 'draw';
                  return (
                    <View key={d.id} style={styles.duelRow}>
                      <PlayerFace card={d.opponent} size={30} />
                      <Txt v="callout" color="#fff" style={{ flex: 1 }} numberOfLines={1}>
                        {d.opponent ? `@${d.opponent.handle}` : d.code ? t('arena.waitingFriend') : '…'} · {languageName(d.lang, s.uiLang)}
                      </Txt>
                      <Txt v="captionMedium" color="#fff">{d.my_score}{done ? ` : ${d.their_score}` : ''}</Txt>
                      {res && <View style={[styles.res, { backgroundColor: res === 'won' ? '#16A34A' : res === 'lost' ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.3)' }]}><Txt style={styles.resTxt}>{t(`arena.${res}`)}</Txt></View>}
                    </View>
                  );
                })}
              </View>
            )}
          </ModeHero>
        </Animated.View>

        {/* fox packs */}
        <Animated.View entering={FadeInDown.delay(160).duration(350)}>
          <PressableScale onPress={() => router.push('/team')} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
            {team.isLoading ? <ActivityIndicator color={c.textSecondary} /> : team.data ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TeamBadge emoji={team.data.emoji} color={team.data.color} size={52} />
                  <View style={{ flex: 1 }}>
                    <Txt v="overline" color={c.textTertiary}>{t('arena.teamTitle')}</Txt>
                    <Txt v="headline" numberOfLines={1}>{teamName(code, team.data.name_a, team.data.name_b)}</Txt>
                  </View>
                  <ChevronRight size={20} color={c.textTertiary} />
                </View>
                {(() => {
                  const sum = team.data.members.reduce((a, m) => a + m.xp, 0);
                  const goal = teamGoal(team.data.members.length);
                  return (
                    <View style={{ marginTop: 14, gap: 8 }}>
                      <ProgressBar value={sum / goal} height={12} color="#F97316" />
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Txt v="captionMedium" color={c.textSecondary} style={{ flex: 1 }}>{t('arena.teamGoal', { xp: sum, goal })}</Txt>
                        <View style={{ flexDirection: 'row' }}>
                          {team.data.members.slice(0, 5).map((m, i) => <View key={m.id} style={{ marginLeft: i ? -8 : 0 }}><PlayerFace card={m} size={26} /></View>)}
                        </View>
                      </View>
                    </View>
                  );
                })()}
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.packIcon, { backgroundColor: '#FFEDD5' }]}><EmojiArt emoji="🦊" size={30} /><View style={{ position: 'absolute', right: -4, bottom: -4 }}><EmojiArt emoji="🦊" size={20} /></View></View>
                <View style={{ flex: 1 }}>
                  <Txt v="headline">{t('arena.teamTitle')}</Txt>
                  <Txt v="caption" color={c.textSecondary} style={{ marginTop: 2 }}>{t('arena.teamSub')}</Txt>
                  <Txt v="captionMedium" color="#EA580C" style={{ marginTop: 8 }}>{t('arena.teamCta')} →</Txt>
                </View>
                <Users size={20} color={c.textTertiary} />
              </View>
            )}
          </PressableScale>
        </Animated.View>

        {/* voice postcards */}
        <Animated.View entering={FadeInDown.delay(240).duration(350)}>
          <PressableScale onPress={() => router.push('/voices')} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.packIcon, { backgroundColor: '#FCE7F3' }]}><EmojiArt emoji="🎙️" size={30} /></View>
              <View style={{ flex: 1 }}>
                <Txt v="overline" color={c.textTertiary}>{t('arena.voicesTitle')}</Txt>
                <Txt v="headline" numberOfLines={2}>“{phraseText(lang)}”</Txt>
              </View>
              <ChevronRight size={20} color={c.textTertiary} />
            </View>
            <Txt v="caption" color={c.textSecondary} style={{ marginTop: 8 }}>{t('arena.voicesSub')}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
                {(voices.data ?? []).slice(0, 5).map((v, i) => <View key={v.id} style={{ marginLeft: i ? -8 : 0 }}><PlayerFace card={v.author} size={26} /></View>)}
                <Txt v="captionMedium" color={c.textSecondary} style={{ marginLeft: voices.data?.length ? 8 : 0 }}>{t('arena.voicesCount', { n: voices.data?.length ?? 0 })}</Txt>
              </View>
              <Txt v="captionMedium" color="#DB2777">{t('arena.voicesCta')} →</Txt>
            </View>
          </PressableScale>
        </Animated.View>

        <Pressable onPress={() => router.push('/league')} style={[styles.card, styles.leagueRow, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <EmojiArt emoji="🏆" size={30} />
          <Txt v="bodyMedium" style={{ flex: 1 }}>{t('league.title')}</Txt>
          <Swords size={18} color={c.textTertiary} />
        </Pressable>
      </ScrollView>
      <ChestReward amount={reward} onClose={() => setReward(0)} emoji="💎" />
    </View>
  );
}

const styles = StyleSheet.create({
  journeyFoot: { marginTop: 10, gap: 2 },
  recent: { marginTop: 14, padding: 12, borderRadius: radius.l, backgroundColor: 'rgba(0,0,0,.14)', gap: 8 },
  duelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  res: { paddingHorizontal: 8, height: 22, borderRadius: 11, justifyContent: 'center' },
  resTxt: { fontSize: 11, color: '#fff', fontWeight: '600' },
  card: { borderRadius: radius.xl, padding: 16, borderWidth: StyleSheet.hairlineWidth },
  packIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.l },
  leagueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
