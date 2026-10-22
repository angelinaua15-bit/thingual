import { Image } from 'expo-image';
import { emojiUrl } from '../../src/data/emoji';
import { EXPRESSIONS, EXPR_KINDS, KIND_EMOJI } from '../../src/data/expressions';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { ArrowRight, Ear, Headphones, Image as ImageIcon, Keyboard, Mic, Puzzle, Search, Type as TypeIcon, Layers } from '../../src/components/icons';
import { Screen, Txt, Button, PressableScale, ProgressBar, PlusBadge } from '../../src/components/ui';
import { Photo, photoForWord } from '../../src/components/Photo';
import { Sheet } from '../../src/components/Overlay';
import { useTheme, fonts, radius, space, TAB_BAR_HEIGHT } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { CONCEPTS, fullWord, labelOf } from '../../src/data/concepts';
import { isDue, mastery } from '../../src/lib/srs';
import { dateKey } from '../../src/data/social';
import { speak, stopSpeaking } from '../../src/lib/feedback';
import { lang } from '../../src/data/languages';
import { Flame } from '../../src/components/Flame';
import { StreakPills } from '../../src/components/StreakBits';
import { MaxBanner } from '../../src/components/MaxBanner';
import { doneToday, visibleStreak } from '../../src/lib/streak';

const EX = [
  { id: 'recall', icon: Layers }, { id: 'listen', icon: Ear }, { id: 'choose', icon: ImageIcon }, { id: 'type', icon: Keyboard },
  { id: 'speak', icon: Mic }, { id: 'sentence', icon: Puzzle }, { id: 'article', icon: TypeIcon }, { id: 'find', icon: Search },
] as const;

export default function Learn() {
  const { c } = useTheme();
  const { t, ta } = useT();
  const s = useApp((x) => x.settings);
  const words = useApp((x) => x.words);
  const history = useApp((x) => x.history);
  const learnStreak = useApp((x) => x.learnStreak);
  const dropStreak = useApp((x) => x.dropStreak);
  const update = useApp((x) => x.updateSettings);
  const exprs = useApp((x) => x.exprs);
  const exprDue = Object.values(exprs).filter((e) => isDue(e.card)).length;
  const [handsFree, setHandsFree] = useState(false);

  const list = Object.values(words);
  const due = list.filter((w) => isDue(w.card));
  const learned = list.filter((w) => mastery(w.card) >= 2).length;

  const week = useMemo(() => {
    const out: { label: string; minutes: number; today: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const h = history.find((x) => x.day === dateKey(d));
      out.push({ label: d.toLocaleDateString(s.uiLang, { weekday: 'narrow' }), minutes: h?.minutes ?? 0, today: i === 0 });
    }
    return out;
  }, [history]);
  const maxMin = Math.max(5, ...week.map((w) => w.minutes));
  const streakN = visibleStreak(learnStreak);
  const streakDone = doneToday(learnStreak);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.m, paddingBottom: TAB_BAR_HEIGHT + 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.s }}>
          <Txt v="display" style={{ flex: 1 }}>{t('learn.title')}</Txt>
          <StreakPills />
        </View>

        {/* streaks */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: space.m }}>
          <Animated.View entering={FadeInDown.delay(60)} style={{ flex: 1 }}>
            <PressableScale onPress={() => router.push('/streak')} style={[styles.stat, { backgroundColor: c.surface, borderColor: c.divider, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
              <Flame size={34} active={streakDone} />
              <View style={{ flex: 1 }}>
                <Txt style={{ fontFamily: fonts.serif, fontSize: 40, lineHeight: 44, color: streakN ? c.text : c.textTertiary }}>{streakN}</Txt>
                <Txt v="caption" color={c.textSecondary}>{streakN ? t('streak.days') : t('learn.noStreak')}</Txt>
              </View>
            </PressableScale>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(120)} style={[styles.stat, { backgroundColor: c.dropSoft, borderColor: 'transparent' }]}>
            <Txt style={{ fontFamily: fonts.serif, fontSize: 40, lineHeight: 44, color: c.drop }}>{dropStreak.count}</Txt>
            <Txt v="caption" color={c.textSecondary}>{t('drop.streak', { n: dropStreak.count })}</Txt>
          </Animated.View>
        </View>

        {/* today */}
        <Animated.View entering={FadeInDown.delay(180)} style={[styles.today, { backgroundColor: c.ink }]}>
          {list.length === 0 ? (
            <>
              <Txt v="headline" color={c.background}>{t('learn.emptyTitle')}</Txt>
              <Txt v="callout" color={c.background} style={{ opacity: 0.7, marginTop: 6, marginBottom: 16 }}>{t('learn.emptySub')}</Txt>
              <Button title={t('dictionary.emptyCta')} variant="inverse" onPress={() => router.navigate('/(tabs)/camera')} />
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Txt v="overline" color={c.background} style={{ opacity: 0.6 }}>{t('common.today')}</Txt>
                  <Txt style={{ fontFamily: fonts.serif, fontSize: 34, lineHeight: 38, color: c.background, marginTop: 4 }}>
                    {due.length ? t('learn.due', { n: due.length }) : t('learn.nothingDue')}
                  </Txt>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  {(due.length ? due : list).slice(0, 3).map((w, i) => (
                    <View key={w.conceptId} style={{ width: 54, height: 68, borderRadius: 12, overflow: 'hidden', marginLeft: i ? -22 : 0, borderWidth: 2, borderColor: c.text, transform: [{ rotate: `${(i - 1) * 6}deg` }] }}>
                      <Photo uri={photoForWord(w.conceptId, w.photo, 200)} style={{ width: '100%', height: '100%' }} />
                    </View>
                  ))}
                </View>
              </View>
              <Txt v="captionMedium" color={c.background} style={{ opacity: 0.6, marginTop: 16, marginBottom: 8 }}>{t('learn.sessionLength')}</Txt>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {([3, 5, 10, 15] as const).map((m) => (
                  <Pressable key={m} onPress={() => update({ dailyMinutes: m })} style={[styles.len, { backgroundColor: s.dailyMinutes === m ? c.background : 'transparent', borderColor: c.background }]}>
                    <Txt v="captionMedium" color={s.dailyMinutes === m ? c.text : c.background}>{t('learn.minutes', { n: m })}</Txt>
                  </Pressable>
                ))}
              </View>
              <Button title={t('learn.start')} variant="inverse" icon={<ArrowRight size={18} color="#141414" />} onPress={() => router.push('/review')} />
            </>
          )}
        </Animated.View>

        {/* phrases & expressions */}
        <Animated.View entering={FadeInDown.delay(210)}>
          <PressableScale onPress={() => router.push('/phrases')} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={{ flexDirection: 'row' }}>
              {EXPR_KINDS.map((k, i) => (
                <View key={k} style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginLeft: i ? -12 : 0, borderWidth: 2, borderColor: c.surface }}>
                  <Image source={{ uri: emojiUrl(KIND_EMOJI[k]) }} style={{ width: 24, height: 24 }} />
                </View>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="bodyMedium">{t('phr.title')}</Txt>
              <Txt v="caption" color={c.textSecondary}>{t('phr.total', { n: EXPRESSIONS.length })}{exprDue ? ` · ${t('phr.reviewDue', { n: exprDue })}` : ''}</Txt>
            </View>
            <ArrowRight size={18} color={c.textTertiary} />
          </PressableScale>
        </Animated.View>

        {/* coverage + week */}
        <Animated.View entering={FadeInDown.delay(240)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <Txt v="bodyMedium">{t('learn.coverage', { n: learned, total: CONCEPTS.length })}</Txt>
          <View style={{ marginTop: 10 }}>
            <ProgressBar value={learned / CONCEPTS.length} height={6} />
          </View>
          <Txt v="overline" color={c.textSecondary} style={{ marginTop: 20, marginBottom: 10 }}>{t('learn.week')}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 84, gap: 8 }}>
            {week.map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <Animated.View entering={FadeInDown.delay(300 + i * 50)} style={{ width: '100%', height: Math.max(4, (d.minutes / maxMin) * 60), borderRadius: 6, backgroundColor: d.minutes ? (d.today ? c.accent : c.text) : c.divider }} />
                <Txt v="caption" color={d.today ? c.text : c.textTertiary} style={{ fontSize: 11 }}>{d.label}</Txt>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* exercises */}
        <Txt v="headline" style={{ marginTop: space.l, marginBottom: 12 }}>{t('learn.exercises')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {EX.map((e, i) => {
            const Icon = e.icon;
            const disabled = e.id === 'article' && !lang(s.active).articles;
            return (
              <Animated.View key={e.id} entering={FadeInRight.delay(300 + i * 40)} style={{ width: '48.5%' }}>
                <PressableScale
                  onPress={() => (disabled ? undefined : e.id === 'find' ? router.push('/find') : router.push({ pathname: '/review', params: { mode: e.id } }))}
                  style={[styles.ex, { backgroundColor: e.id === 'find' ? c.dropSoft : c.surface, borderColor: c.divider, opacity: disabled ? 0.4 : 1 }]}
                >
                  <Icon size={20} color={e.id === 'find' ? c.drop : c.text} />
                  <Txt v="bodyMedium" style={{ marginTop: 10 }}>{t(`learn.ex.${e.id}`)}</Txt>
                  {e.id === 'find' && <Txt v="caption" color={c.textSecondary} style={{ marginTop: 4 }}>{t('learn.exSub.find')}</Txt>}
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>

        <PressableScale onPress={() => setHandsFree(true)} style={[styles.card, styles.hands, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <Headphones size={22} color={c.text} />
          <View style={{ flex: 1 }}>
            <Txt v="bodyMedium">{t('learn.handsFree')}</Txt>
            <Txt v="caption" color={c.textSecondary}>{t('learn.exSub.handsFree')}</Txt>
          </View>
        </PressableScale>
        <MaxBanner style={{ marginTop: 12 }} />
      </ScrollView>
      <HandsFree visible={handsFree} onClose={() => setHandsFree(false)} />
    </Screen>
  );
}

/** Plays word in target language, pause, native translation — in a loop. */
function HandsFree({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const s = useApp((x) => x.settings);
  const words = useApp((x) => x.words);
  const ids = Object.keys(words);
  const [i, setI] = useState(0);
  const alive = useRef(false);

  useEffect(() => {
    if (!visible || !ids.length) return;
    alive.current = true;
    let k = 0;
    const step = () => {
      if (!alive.current) return;
      const id = ids[k % ids.length];
      setI(k % ids.length);
      speak(labelOf(id, s.active)!.word, s.active, {
        onDone: () => setTimeout(() => {
          if (!alive.current) return;
          speak(labelOf(id, s.native)!.word, s.native, { onDone: () => { k += 1; setTimeout(step, 1200); } });
        }, 900),
      });
    };
    step();
    return () => {
      alive.current = false;
      stopSpeaking();
    };
  }, [visible]);

  const id = ids[i];
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ alignItems: 'center', padding: 24, gap: 14 }}>
        {id && (
          <Animated.View key={id} entering={FadeInDown} style={{ alignItems: 'center' }}>
            <View style={{ width: 160, height: 200, borderRadius: radius.l, overflow: 'hidden' }}>
              <Photo uri={photoForWord(id, words[id]?.photo, 400)} style={{ width: '100%', height: '100%' }} />
            </View>
            <Txt style={{ fontFamily: fonts.serif, fontSize: 40, color: c.text, marginTop: 14 }}>{fullWord(id, s.active)}</Txt>
            <Txt v="callout" color={c.textSecondary}>{labelOf(id, s.native)?.word}</Txt>
          </Animated.View>
        )}
        <Txt v="caption" color={c.textSecondary}>{t('learn.handsFreePlaying', { n: ids.length })}</Txt>
        <Button title={t('learn.stop')} variant="secondary" onPress={onClose} style={{ alignSelf: 'stretch' }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, padding: 16, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  today: { marginTop: 12, padding: 20, borderRadius: radius.xl },
  len: { paddingHorizontal: 12, height: 32, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  card: { marginTop: 12, padding: 18, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  ex: { padding: 16, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, minHeight: 104 },
  hands: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
