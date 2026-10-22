import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { goBack } from '../src/lib/nav';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Camera, Check, ChevronDown, Crown, Languages, Lock, MessageCircle, Snowflake, Sparkle, X, NotebookPen, Headphones } from '../src/components/icons';
import { Txt, Button } from '../src/components/ui';
import { Flame } from '../src/components/Flame';
import { toast } from '../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { joinPremiumWaitlist } from '../src/lib/api';
import { haptic } from '../src/lib/feedback';
import { FREE_TOPICS, LIMITS, useIsMax, type MaxReason } from '../src/lib/premium';
import { TOPICS } from '../src/data/concepts';

type Plan = 'monthly' | 'yearly' | 'family';
const PLANS: { id: Plan; price: string; per: 'perMonth' | 'perYear'; save?: number; monthly?: string }[] = [
  { id: 'yearly', price: '$34.99', per: 'perYear', save: 42, monthly: '$2.92' },
  { id: 'monthly', price: '$4.99', per: 'perMonth' },
  { id: 'family', price: '$54.99', per: 'perYear' },
];
const GOLD = '#FFD66B';

export default function Premium() {
  const { c } = useTheme();
  const { t, ta, code } = useT();
  const insets = useSafeAreaInsets();
  const waitlist = useApp((s) => s.maxWaitlist);
  const setWaitlist = useApp((s) => s.setMaxWaitlist);
  const [plan, setPlan] = useState<Plan>(waitlist ?? 'yearly');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const { reason } = useLocalSearchParams<{ reason?: MaxReason }>();
  const max = useIsMax();
  const maxUntil = useApp((s) => s.maxUntil);
  const trialUsed = useApp((s) => s.trialUsed);
  const fill = (x: string) => x.replace('{ai}', String(LIMITS.aiScansPerDay)).replace('{chat}', String(LIMITS.chatPerDay)).replace('{word}', String(LIMITS.wordAiPerDay)).replace('{books}', String(LIMITS.freeBooksPerLang)).replace('{total}', String(TOPICS.length)).replace('{free}', String(FREE_TOPICS.length));
  const until = maxUntil ? new Date(maxUntil).toLocaleDateString(code, { day: 'numeric', month: 'long' }) : '';
  const trial = () => {
    if (useApp.getState().startTrial()) {
      haptic.success();
      toast(t('max.trialStarted'), 'success');
      goBack();
    }
  };

  const perks = [
    { k: 'ai', icon: <Camera size={20} color={GOLD} /> },
    { k: 'chat', icon: <MessageCircle size={20} color="#A7F3D0" /> },
    { k: 'books', icon: <Headphones size={20} color="#93C5FD" /> },
    { k: 'notebook', icon: <NotebookPen size={20} color="#FDBA74" /> },
    { k: 'phrases', icon: <BookOpen size={20} color="#FCA5A5" /> },
    { k: 'grammar', icon: <Check size={20} color="#86EFAC" /> },
    { k: 'topics', icon: <Sparkle size={20} color="#FDE68A" /> },
    { k: 'langs', icon: <Languages size={20} color="#F0ABFC" /> },
    { k: 'freeze', icon: <Snowflake size={20} color="#93C5FD" /> },
    { k: 'sparks', icon: <Sparkle size={20} color="#F59F00" fill="#F59F00" /> },
    { k: 'flame', icon: <Flame size={18} skin="gold" animate={false} /> },
  ];

  const notify = async () => {
    setBusy(true);
    try {
      await joinPremiumWaitlist(plan);
      setWaitlist(plan);
      haptic.success();
    } catch {
      toast(t('social.offline'));
    } finally {
      setBusy(false);
    }
  };

  const U = t('premium.cells.unlimited');
  const rows: [string, string, string][] = [
    ['words', '✓', '✓'], ['drop', '✓', '✓'],
    ['ai', t('premium.cells.aiFree', { ai: LIMITS.aiScansPerDay }), U],
    ['chat', t('premium.cells.chatFree', { chat: LIMITS.chatPerDay }), U],
    ['books', t('premium.cells.booksFree', { n: LIMITS.freeBooksPerLang }), t('premium.cells.all')],
    ['notebook', t('premium.cells.wordFree', { word: LIMITS.wordAiPerDay }), U],
    ['phrases', t('premium.cells.phrasesFree'), t('premium.cells.all')],
    ['english', t('premium.cells.englishFree', { n: LIMITS.freeExprPerKind }), t('premium.cells.all')],
    ['grammar', t('premium.cells.grammarFree'), t('premium.cells.grammarMax')],
    ['topics', t('premium.cells.topicsFree', { free: FREE_TOPICS.length, total: TOPICS.length }), t('premium.cells.all')],
    ['bulk', '—', '✓'],
    ['langs', t('premium.cells.langsFree'), t('premium.cells.langsMax')],
    ['freeze', t('premium.cells.freezeFree'), t('premium.cells.freezeMax')],
    ['sparks', '×1', t('premium.cells.sparksMax')],
    ['map', '—', '✓'],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* hero */}
        <LinearGradient colors={['#14112A', '#2E2160', '#4B2F86']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + 12, paddingHorizontal: space.l, paddingBottom: space.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable onPress={() => goBack()} hitSlop={12} style={styles.close}><X size={20} color="#fff" /></Pressable>
          </View>
          <View style={{ maxWidth: 560, width: '100%', alignSelf: 'center' }}>
            {reason && !max ? (
              <Animated.View entering={FadeInDown.springify()} style={styles.reason}>
                <Lock size={16} color="#1F1B3A" />
                <Txt v="captionMedium" color="#1F1B3A" style={{ flex: 1 }}>{t(`max.reasons.${reason}`)}</Txt>
              </Animated.View>
            ) : null}
            <Animated.View entering={FadeInDown.springify()} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Crown size={30} color={GOLD} />
              <View style={styles.soon}><Txt v="caption" color="#1F1B3A" style={{ fontFamily: fonts.semibold }}>{max ? t('max.active') : t('premium.soon')}</Txt></View>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(80).springify()}>
              <Txt style={{ fontFamily: fonts.serif, fontSize: 52, lineHeight: 56, color: '#fff', marginTop: 14 }}>{t('premium.title')}</Txt>
              <Txt v="headline" color={GOLD} style={{ marginTop: 4 }}>{t('premium.tagline')}</Txt>
              <Txt v="callout" color="rgba(255,255,255,.72)" style={{ marginTop: 10 }}>{t('premium.sub')}</Txt>
            </Animated.View>
            <View style={{ marginTop: space.l, gap: 14 }}>
              {perks.map((p, i) => {
                const [title, sub] = ta(`premium.perks.${p.k}`);
                return (
                  <Animated.View key={p.k} entering={FadeInDown.delay(160 + i * 60).springify()} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                    <View style={styles.perkIc}>{p.icon}</View>
                    <View style={{ flex: 1 }}>
                      <Txt v="bodyMedium" color="#fff">{fill(title)}</Txt>
                      <Txt v="caption" color="rgba(255,255,255,.6)">{fill(sub)}</Txt>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
            <View style={{ marginTop: space.l }}>
              {max ? (
                <View style={styles.activeBox}>
                  <Crown size={18} color={GOLD} />
                  <Txt v="bodyMedium" color="#fff" style={{ flex: 1 }}>{t('max.activeUntil', { date: until })}</Txt>
                </View>
              ) : !trialUsed ? (
                <>
                  <Pressable onPress={trial} style={styles.trialBtn}>
                    <Crown size={18} color="#1F1B3A" />
                    <Txt v="bodyMedium" color="#1F1B3A" style={{ fontFamily: fonts.semibold }}>{t('max.trial')}</Txt>
                  </Pressable>
                  <Txt v="caption" color="rgba(255,255,255,.6)" center style={{ marginTop: 8 }}>{t('max.trialSub')}</Txt>
                </>
              ) : (
                <Txt v="caption" color="rgba(255,255,255,.7)" center>{t('max.trialUsed')}</Txt>
              )}
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: space.m, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
          {/* plans */}
          <Txt v="overline" color={c.textSecondary} style={styles.section}>{t('premium.plans')}</Txt>
          <View style={{ gap: 10 }}>
            {PLANS.map((p) => {
              const on = plan === p.id;
              return (
                <Pressable key={p.id} onPress={() => { haptic.light(); setPlan(p.id); }} style={[styles.plan, { backgroundColor: c.surface, borderColor: on ? c.text : c.divider, borderWidth: on ? 2 : StyleSheet.hairlineWidth }]}>
                  <View style={[styles.radio, { borderColor: on ? c.text : c.textTertiary }]}>{on && <View style={[styles.radioIn, { backgroundColor: c.text }]} />}</View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Txt v="bodyMedium">{t(`premium.${p.id}`)}</Txt>
                      {p.save ? <View style={[styles.save, { backgroundColor: c.success }]}><Txt v="caption" color="#fff" style={{ fontSize: 11 }}>{t('premium.save', { n: p.save })}</Txt></View> : null}
                    </View>
                    {p.monthly ? <Txt v="caption" color={c.textSecondary}>{p.monthly} {t('premium.perMonth')} · {t('premium.popular')}</Txt> : null}
                  </View>
                  <Txt v="bodyMedium">{p.price}</Txt>
                  <Txt v="caption" color={c.textSecondary}> {t(`premium.${p.per}`)}</Txt>
                </Pressable>
              );
            })}
          </View>

          <Animated.View layout={LinearTransition} style={{ marginTop: space.m }}>
            {waitlist ? (
              <Animated.View entering={FadeIn} style={[styles.onList, { backgroundColor: c.successSoft }]}>
                <Check size={20} color={c.success} />
                <View style={{ flex: 1 }}>
                  <Txt v="bodyMedium">{t('premium.onList')}</Txt>
                  <Txt v="caption" color={c.textSecondary}>{t('premium.onListSub')}</Txt>
                </View>
              </Animated.View>
            ) : (
              <Button title={t('premium.notify')} loading={busy} icon={<Crown size={18} color={c.onAccent} />} onPress={notify} />
            )}
            <Txt v="caption" color={c.textTertiary} center style={{ marginTop: 10 }}>{t('premium.note')}</Txt>
          </Animated.View>

          {/* compare */}
          <Txt v="overline" color={c.textSecondary} style={styles.section}>{t('premium.compare')}</Txt>
          <View style={[styles.table, { backgroundColor: c.surface, borderColor: c.divider }]}>
            <View style={[styles.tr, { borderBottomColor: c.divider }]}>
              <View style={{ flex: 1 }} />
              <Txt v="captionMedium" color={c.textSecondary} style={styles.col}>{t('premium.free')}</Txt>
              <Txt v="captionMedium" color="#8B5CF6" style={styles.col}>{t('premium.badge')}</Txt>
            </View>
            {rows.map(([k, a, b], i) => (
              <View key={k} style={[styles.tr, { borderBottomColor: c.divider, borderBottomWidth: i === rows.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
                <Txt v="callout" style={{ flex: 1 }}>{t(`premium.rows.${k}`)}</Txt>
                <Txt v="caption" color={c.textSecondary} style={styles.col}>{a}</Txt>
                <Txt v="captionMedium" style={styles.col}>{b}</Txt>
              </View>
            ))}
          </View>

          {/* FAQ */}
          <Txt v="overline" color={c.textSecondary} style={styles.section}>{t('premium.faq')}</Txt>
          {[1, 2, 3].map((n) => (
            <Pressable key={n} onPress={() => setOpen(open === n ? null : n)} style={[styles.faq, { borderColor: c.divider }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Txt v="bodyMedium" style={{ flex: 1 }}>{t(`premium.q${n}`)}</Txt>
                <ChevronDown size={18} color={c.textSecondary} style={{ transform: [{ rotate: open === n ? '180deg' : '0deg' }] }} />
              </View>
              {open === n && <Animated.View entering={FadeIn}><Txt v="callout" color={c.textSecondary} style={{ marginTop: 6 }}>{t(`premium.a${n}`)}</Txt></Animated.View>}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: GOLD, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, marginBottom: 16 },
  trialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 28, backgroundColor: GOLD },
  activeBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,214,107,.14)' },
  soon: { backgroundColor: GOLD, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  perkIc: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: space.l, marginBottom: 10 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.l },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioIn: { width: 10, height: 10, borderRadius: 5 },
  save: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  onList: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.l },
  table: { borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  col: { width: 82, textAlign: 'center' },
  faq: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});
