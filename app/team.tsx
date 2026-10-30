import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { ChevronLeft, Dices, Share2 } from '../src/components/icons';
import { Txt, ProgressBar, Toggle, EmptyState } from '../src/components/ui';
import { EmojiArt } from '../src/components/NoteBits';
import { ChunkyButton } from '../src/components/PathBits';
import { Floaty } from '../src/components/Fx';
import { ChestReward } from '../src/components/Reward';
import { PlayerFace, TeamBadge, teamColor, teamName } from '../src/components/ArenaBits';
import { toast } from '../src/components/Overlay';
import { useTheme, fonts, radius } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp, weekKey } from '../src/store/useApp';
import { goBack } from '../src/lib/nav';
import { haptic } from '../src/lib/feedback';
import { shareText } from '../src/lib/share';
import { qc, useNet, connect } from '../src/lib/queries';
import { ensureSession } from '../src/lib/api';
import {
  TEAM_A, TEAM_B, TEAM_COLORS, TEAM_EMOJI, TEAM_MAX, TeamError, createTeam, joinRandomTeam, joinTeam, leaveTeam, myTeam, teamBoard, teamGoal, teamLink,
} from '../src/lib/arena';

const TEAM_CHEST = 30;

/** Fox packs: up to 10 people (family, a class, friends) with a shared weekly goal. */
export default function Team() {
  const { c } = useTheme();
  const { t, code: ui } = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();
  const status = useNet((x) => x.status);
  const on = status === 'ok';
  const week = weekKey();
  const team = useQuery({ queryKey: ['myTeam', week], queryFn: myTeam, enabled: on });
  const board = useQuery({ queryKey: ['teamBoard', week], queryFn: teamBoard, enabled: on });
  const claimed = useApp((x) => !!x.path[`arena:team:${week}`]);
  const [me, setMe] = useState('');
  const [busy, setBusy] = useState(false);
  const [reward, setReward] = useState(0);
  const [leaveArmed, setLeaveArmed] = useState(false);
  // create form
  const [a, setA] = useState(() => Math.floor(Math.random() * TEAM_A));
  const [b, setB] = useState(() => Math.floor(Math.random() * TEAM_B));
  const [emoji, setEmoji] = useState(TEAM_EMOJI[0]);
  const [color, setColor] = useState(0);
  const [open, setOpen] = useState(true);
  const [joinCode, setJoinCode] = useState(params.code ? String(params.code).toUpperCase() : '');

  useEffect(() => { ensureSession().then(setMe).catch(() => {}); }, []);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['myTeam'] }); qc.invalidateQueries({ queryKey: ['teamBoard'] }); };

  const run = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try { await fn(); haptic.success(); refresh(); }
    catch (e) { toast(e instanceof TeamError ? (e.message === 'other' ? t('arena.offline') : t(`teams.${e.message}`)) : t('arena.offline')); }
    finally { setBusy(false); }
  };

  const data = team.data;
  const sum = data ? data.members.reduce((x, m) => x + m.xp, 0) : 0;
  const goal = data ? teamGoal(data.members.length) : 0;
  const name = data ? teamName(ui, data.name_a, data.name_b) : '';

  const header = (
    <View style={styles.bar}>
      <Pressable onPress={() => goBack('/(tabs)/arena')} hitSlop={12} style={styles.back}><ChevronLeft size={26} color={data ? '#fff' : c.text} /></Pressable>
    </View>
  );

  if (status === 'offline') {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
        {header}
        <EmptyState art={<EmojiArt emoji="🦊" size={80} />} title={t('arena.offline')} cta={t('arena.retry')} onCta={() => connect()} />
      </View>
    );
  }
  if (team.isLoading || status === 'idle') {
    return <View style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.textSecondary} /></View>;
  }

  /* ---------------- I'm in a pack ---------------- */
  if (data) {
    const col = teamColor(data.color);
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          <LinearGradient colors={[col, '#1E1B4B']} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1.2 }} style={{ paddingTop: insets.top, paddingBottom: 26, paddingHorizontal: 20 }}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {[data.emoji, '⭐', data.emoji, '✨'].map((e, k) => (
                <Floaty key={k} amp={10} period={2600 + k * 500} delay={k * 300} style={{ position: 'absolute', opacity: 0.18, top: 30 + k * 40, [k % 2 ? 'left' : 'right']: 16 + k * 30 }}>
                  <EmojiArt emoji={e} size={44} />
                </Floaty>
              ))}
            </View>
            {header}
            <View style={{ alignItems: 'center', maxWidth: 560, width: '100%', alignSelf: 'center' }}>
              <Animated.View entering={ZoomIn.springify()}><TeamBadge emoji={data.emoji} color={data.color} size={96} /></Animated.View>
              <Txt style={styles.title}>{name}</Txt>
              <Txt v="captionMedium" color="rgba(255,255,255,.8)" style={{ marginTop: 4 }}>{t('teams.members', { n: data.members.length })} · {t('teams.code', { code: data.code })}</Txt>
              <View style={styles.goalBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Txt v="overline" color="rgba(255,255,255,.85)" style={{ flex: 1 }}>{t('teams.goal')}</Txt>
                  <Txt v="captionMedium" color="#fff">{sum} / {goal} XP</Txt>
                </View>
                <ProgressBar value={sum / goal} height={14} color="#FDE047" track="rgba(255,255,255,.2)" />
                {sum >= goal && !claimed && (
                  <Pressable onPress={() => { const n = useApp.getState().claimReward(`arena:team:${week}`, TEAM_CHEST); if (n) setReward(n); }} style={styles.chestBtn}>
                    <Floaty amp={3} period={700}><EmojiArt emoji="🎁" size={28} /></Floaty>
                    <Txt v="bodyMedium" color="#1E1B4B">{t('teams.goalDone')}</Txt>
                  </Pressable>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable onPress={() => shareText(t('teams.inviteText', { name, code: data.code, link: teamLink(data.code) }))} style={styles.invite}>
                  <Share2 size={16} color="#1E1B4B" /><Txt v="bodyMedium" color="#1E1B4B">{t('teams.invite')}</Txt>
                </Pressable>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            {data.members.map((m, k) => (
              <Animated.View key={m.id} entering={FadeInDown.delay(k * 50)} style={[styles.member, { backgroundColor: m.id === me ? c.surfaceAlt : c.surface, borderColor: c.divider }]}>
                <Txt v="headline" color={k < 3 ? ['#E8B23A', '#AEB8C2', '#C98A5A'][k] : c.textTertiary} style={{ width: 24 }}>{k + 1}</Txt>
                <PlayerFace card={m} size={40} me={m.id === me} />
                <View style={{ flex: 1 }}>
                  <Txt v="bodyMedium" numberOfLines={1}>{m.name || m.handle}{m.id === me ? ` · ${t('teams.you')}` : ''}</Txt>
                  <Txt v="caption" color={c.textSecondary}>@{m.handle}</Txt>
                </View>
                <Txt v="headline">{m.xp}</Txt>
                <Txt v="caption" color={c.textTertiary}>XP</Txt>
              </Animated.View>
            ))}
            {data.members.length < TEAM_MAX && (
              <Pressable onPress={() => shareText(t('teams.inviteText', { name, code: data.code, link: teamLink(data.code) }))} style={[styles.member, styles.empty, { borderColor: c.divider }]}>
                <EmojiArt emoji="➕" size={22} />
                <Txt v="bodyMedium" color={c.textSecondary}>{t('teams.invite')}</Txt>
              </Pressable>
            )}

            <Board rows={board.data} mine={data.id} />

            <Pressable onPress={() => { if (!leaveArmed) { setLeaveArmed(true); setTimeout(() => setLeaveArmed(false), 3000); return; } run(leaveTeam); }} style={{ alignItems: 'center', padding: 16, marginTop: 8 }}>
              <Txt v="callout" color="#DC2626">{leaveArmed ? t('teams.leaveConfirm') : t('teams.leave')}</Txt>
            </Pressable>
          </View>
        </ScrollView>
        <ChestReward amount={reward} onClose={() => setReward(0)} />
      </View>
    );
  }

  /* ---------------- no pack yet: create or join ---------------- */
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40, paddingHorizontal: 16, maxWidth: 600, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        {header}
        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            {['🦊', '🦊', '🦊'].map((e, k) => <Floaty key={k} amp={5} period={900 + k * 200} delay={k * 150}><EmojiArt emoji={e} size={k === 1 ? 64 : 44} /></Floaty>)}
          </View>
          <Txt v="display" center style={{ marginTop: 8 }}>{t('teams.title')}</Txt>
          <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 6, maxWidth: 420 }}>{t('teams.sub')}</Txt>
        </View>

        {/* join with a code */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <Txt v="headline">{t('teams.join')}</Txt>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TextInput value={joinCode} onChangeText={(x) => setJoinCode(x.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder={t('teams.codePh')} placeholderTextColor={c.textTertiary}
              autoCapitalize="characters" autoCorrect={false} style={[styles.input, { color: c.text, backgroundColor: c.surfaceAlt }]} />
            <Pressable disabled={joinCode.length !== 6 || busy} onPress={() => run(() => joinTeam(joinCode))} style={[styles.joinBtn, { backgroundColor: joinCode.length === 6 ? '#2FB574' : c.surfaceAlt }]}>
              <Txt v="bodyMedium" color={joinCode.length === 6 ? '#fff' : c.textTertiary}>{t('teams.joinBtn')}</Txt>
            </Pressable>
          </View>
          <Pressable onPress={() => run(async () => { if (!(await joinRandomTeam())) toast(t('teams.noRandom')); })} style={{ marginTop: 12 }}>
            <Txt v="bodyMedium" color="#EA580C">🎲 {t('teams.random')}</Txt>
          </Pressable>
        </View>

        {/* create */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <Txt v="headline">{t('teams.create')}</Txt>
          <View style={[styles.preview, { backgroundColor: teamColor(color) }]}>
            <TeamBadge emoji={emoji} color={color} size={56} />
            <Txt style={{ fontFamily: fonts.semibold, fontSize: 19, color: '#fff', flex: 1 }} numberOfLines={2}>{teamName(ui, a, b)}</Txt>
            <Pressable onPress={() => { haptic.light(); setA(Math.floor(Math.random() * TEAM_A)); setB(Math.floor(Math.random() * TEAM_B)); }} style={styles.dice} accessibilityLabel={t('teams.shuffle')}>
              <Dices size={22} color="#fff" />
            </Pressable>
          </View>
          <Txt v="overline" color={c.textTertiary} style={{ marginTop: 14 }}>{t('teams.emoji')}</Txt>
          <View style={styles.wrap}>
            {TEAM_EMOJI.map((e) => (
              <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.pick, { borderColor: emoji === e ? c.text : 'transparent', backgroundColor: c.surfaceAlt }]}><EmojiArt emoji={e} size={28} /></Pressable>
            ))}
          </View>
          <Txt v="overline" color={c.textTertiary} style={{ marginTop: 14 }}>{t('teams.color')}</Txt>
          <View style={styles.wrap}>
            {TEAM_COLORS.map((col, k) => (
              <Pressable key={col} onPress={() => setColor(k)} style={[styles.swatch, { backgroundColor: col, borderColor: color === k ? c.text : 'transparent' }]} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt v="bodyMedium">{t('teams.open')}</Txt>
              <Txt v="caption" color={c.textSecondary}>{t('teams.openSub')}</Txt>
            </View>
            <Toggle value={open} onChange={setOpen} />
          </View>
          <View style={{ marginTop: 18 }}>
            <ChunkyButton title={t('teams.createBtn')} color="#F97316" disabled={busy} onPress={() => run(() => createTeam(a, b, emoji, color, open))} />
          </View>
        </View>

        <Board rows={board.data} />
      </ScrollView>
    </View>
  );
}

function Board({ rows, mine }: { rows?: { id: string; name_a: number; name_b: number; emoji: string; color: number; members: number; xp: number }[]; mine?: string }) {
  const { c } = useTheme();
  const { t, code } = useT();
  if (!rows?.length) return null;
  return (
    <View style={{ marginTop: 22 }}>
      <Txt v="overline" color={c.textTertiary} style={{ marginBottom: 8 }}>{t('teams.board')}</Txt>
      {rows.slice(0, 20).map((r, k) => (
        <View key={r.id} style={[styles.member, { backgroundColor: r.id === mine ? c.surfaceAlt : c.surface, borderColor: c.divider }]}>
          <Txt v="headline" color={k < 3 ? ['#E8B23A', '#AEB8C2', '#C98A5A'][k] : c.textTertiary} style={{ width: 24 }}>{k + 1}</Txt>
          <TeamBadge emoji={r.emoji} color={r.color} size={36} />
          <View style={{ flex: 1 }}>
            <Txt v="bodyMedium" numberOfLines={1}>{teamName(code, r.name_a, r.name_b)}</Txt>
            <Txt v="caption" color={c.textSecondary}>{r.members}/10 🦊</Txt>
          </View>
          <Txt v="headline">{Number(r.xp)}</Txt>
          <Txt v="caption" color={c.textTertiary}>XP</Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 48, flexDirection: 'row', alignItems: 'center' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  title: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, color: '#fff', textAlign: 'center', marginTop: 12 },
  goalBox: { alignSelf: 'stretch', marginTop: 18, padding: 14, borderRadius: radius.l, backgroundColor: 'rgba(255,255,255,.12)' },
  chestBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 10, borderRadius: 14, backgroundColor: '#FDE047' },
  invite: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 18, borderRadius: 21, backgroundColor: '#fff' },
  body: { padding: 16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  empty: { justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1.5 },
  section: { marginTop: 18, padding: 16, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, height: 48, borderRadius: 14, paddingHorizontal: 14, fontFamily: fonts.semibold, fontSize: 17, letterSpacing: 2 },
  joinBtn: { height: 48, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.l, marginTop: 12 },
  dice: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.22)', alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pick: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
});
