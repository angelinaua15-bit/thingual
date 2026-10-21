import React, { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Award, BookOpen, Flame, Lock, Pencil, Settings, Sparkles, UserPlus, Globe2, Camera, Languages, Trophy } from 'lucide-react-native';
import { Screen, Txt, Avatar, Button, PressableScale } from '../../src/components/ui';
import { Photo } from '../../src/components/Photo';
import { Sheet, toast } from '../../src/components/Overlay';
import { useTheme, fonts, radius, space, TAB_BAR_HEIGHT } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { FRIENDS, dateKey } from '../../src/data/social';
import { haptic } from '../../src/lib/feedback';

const ACH = [
  { id: 'first-word', icon: BookOpen }, { id: '25-words', icon: Languages }, { id: '100-words', icon: Trophy }, { id: 'first-post', icon: Camera },
  { id: 'streak-7', icon: Flame }, { id: 'drop-30', icon: Sparkles }, { id: 'ten-countries', icon: Globe2 }, { id: 'five-langs', icon: Award },
];

export default function Profile() {
  const { c } = useTheme();
  const { t } = useT();
  const profile = useApp((x) => x.profile);
  const words = useApp((x) => x.words);
  const learnStreak = useApp((x) => x.learnStreak);
  const drops = useApp((x) => x.drops);
  const premium = useApp((x) => x.premium);
  const achievements = useApp((x) => x.achievements);
  const friends = useApp((x) => x.friends);
  const myPosts = useApp((x) => x.myPosts);
  const setNickname = useApp((x) => x.setNickname);
  const link = useApp((x) => x.link);
  const [editing, setEditing] = useState(false);
  const [nick, setNick] = useState(profile.nickname);
  const [linkOpen, setLinkOpen] = useState(false);
  const streakActive = learnStreak.last === dateKey() || learnStreak.last === dateKey(new Date(Date.now() - 86400000));

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.m, paddingBottom: TAB_BAR_HEIGHT + 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 }}>
          <Pressable onPress={() => router.push('/settings')} hitSlop={10} accessibilityLabel={t('profile.settings')}>
            <Settings size={22} color={c.text} />
          </Pressable>
        </View>

        <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center' }}>
          <Animated.View entering={ZoomIn.springify().damping(14)}>
            <Avatar seed={profile.id} size={92} label={profile.nickname} />
          </Animated.View>
          {editing ? (
            <TextInput
              value={nick}
              onChangeText={setNick}
              autoFocus
              onBlur={() => { setNickname(nick); setEditing(false); }}
              onSubmitEditing={() => { setNickname(nick); setEditing(false); }}
              style={{ fontFamily: fonts.serif, fontSize: 34, color: c.text, marginTop: 14, textAlign: 'center', minWidth: 200, borderBottomWidth: 1, borderColor: c.divider }}
            />
          ) : (
            <Pressable onPress={() => setEditing(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <Txt style={{ fontFamily: fonts.serif, fontSize: 34, color: c.text }}>{profile.nickname}</Txt>
              <Pencil size={16} color={c.textTertiary} />
            </Pressable>
          )}
          <Txt v="caption" color={c.textSecondary} style={{ marginTop: 4 }}>
            {profile.linked ? t('profile.linked', { m: profile.linked === 'apple' ? 'Apple' : profile.linked === 'google' ? 'Google' : 'Email' }) : t('common.demo')}
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)} style={[styles.stats, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <Stat n={Object.keys(words).length} label={t('profile.words')} />
          <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: c.divider }} />
          <Stat n={streakActive ? learnStreak.count : 0} label={t('profile.streak')} />
          <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: c.divider }} />
          <Stat n={Object.keys(drops).length} label={t('profile.drops')} color={c.drop} />
        </Animated.View>

        {!profile.linked && (
          <Animated.View entering={FadeInDown.delay(150)}>
            <PressableScale onPress={() => setLinkOpen(true)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
              <Lock size={20} color={c.text} />
              <View style={{ flex: 1 }}>
                <Txt v="bodyMedium">{t('profile.link')}</Txt>
                <Txt v="caption" color={c.textSecondary}>{t('profile.linkSub')}</Txt>
              </View>
            </PressableScale>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(200)}>
          <PressableScale onPress={() => router.push('/paywall')} style={[styles.plus, { backgroundColor: premium ? c.accentSoft : c.text }]}>
            <Sparkles size={22} color={premium ? c.accent : c.background} />
            <View style={{ flex: 1 }}>
              <Txt v="bodyMedium" color={premium ? c.accent : c.background}>{premium ? t('profile.plusActive') : t('profile.getPlus')}</Txt>
              {!premium && <Txt v="caption" color={c.background} style={{ opacity: 0.65 }}>{t('paywall.f1')}</Txt>}
            </View>
          </PressableScale>
        </Animated.View>

        <Txt v="headline" style={{ marginTop: space.l, marginBottom: 12 }}>{t('profile.achievements')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {ACH.map((a, i) => {
            const on = achievements.includes(a.id);
            const Icon = a.icon;
            return (
              <Animated.View key={a.id} entering={FadeInDown.delay(250 + i * 40)} style={[styles.ach, { backgroundColor: c.surface, borderColor: c.divider, opacity: on ? 1 : 0.45 }]}>
                <View style={[styles.achIcon, { backgroundColor: on ? c.text : c.surfaceAlt }]}>
                  <Icon size={18} color={on ? c.background : c.textTertiary} />
                </View>
                <Txt v="caption" center numberOfLines={2} style={{ marginTop: 8 }}>{t(`profile.ach.${a.id}`)}</Txt>
              </Animated.View>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.l, marginBottom: 12 }}>
          <Txt v="headline" style={{ flex: 1 }}>{t('profile.friends')}</Txt>
          <Pressable
            onPress={async () => {
              const link = `https://thingual.app/i/${profile.id}`;
              await Share.share({ message: t('profile.inviteText', { link }) });
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <UserPlus size={16} color={c.accent} />
            <Txt v="captionMedium" color={c.accent}>{t('profile.invite')}</Txt>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
          {FRIENDS.filter((f) => friends.includes(f.id)).map((f) => (
            <View key={f.id} style={{ alignItems: 'center', width: 72 }}>
              <Avatar seed={f.id} size={56} label={f.nickname} />
              <Txt v="caption" numberOfLines={1} style={{ marginTop: 6 }}>{f.nickname}</Txt>
            </View>
          ))}
        </ScrollView>

        <Txt v="headline" style={{ marginTop: space.l, marginBottom: 12 }}>{t('profile.myPosts')}</Txt>
        {myPosts.length === 0 ? (
          <Txt v="callout" color={c.textSecondary}>{t('profile.noPosts')}</Txt>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {myPosts.map((p) => (
              <Pressable key={p.id} onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })} style={{ width: '32%', aspectRatio: 0.8, borderRadius: 12, overflow: 'hidden' }}>
                <Photo uri={p.photo} style={{ width: '100%', height: '100%' }} />
                {p.isDrop && <View style={{ position: 'absolute', top: 6, left: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: c.drop }} />}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Sheet visible={linkOpen} onClose={() => setLinkOpen(false)} title={t('profile.link')}>
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          <Txt v="callout" color={c.textSecondary}>{t('profile.linkSub')}</Txt>
          {(['apple', 'google', 'email'] as const).map((m) => (
            <Button
              key={m}
              title={m === 'apple' ? 'Sign in with Apple' : m === 'google' ? 'Continue with Google' : 'Email'}
              variant={m === 'apple' ? 'primary' : 'secondary'}
              onPress={() => { link(m); haptic.success(); setLinkOpen(false); toast(t('common.done')); }}
            />
          ))}
          <Txt v="caption" color={c.textTertiary} center>{t('profile.linkTest')}</Txt>
        </View>
      </Sheet>
    </Screen>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
      <Txt style={{ fontFamily: fonts.serif, fontSize: 34, lineHeight: 38, color: color ?? c.text }}>{n}</Txt>
      <Txt v="caption" color={c.textSecondary}>{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', marginTop: space.l, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, marginTop: 12 },
  plus: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: radius.l, marginTop: 12 },
  ach: { width: '23%', minWidth: 76, alignItems: 'center', padding: 10, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth },
  achIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
