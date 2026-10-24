import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Check, Volume2, X } from '../src/components/icons';
import { Txt, ProgressBar } from '../src/components/ui';
import { EmojiArt } from '../src/components/NoteBits';
import { ChunkyButton, FoxArt, Mascot } from '../src/components/PathBits';
import { Confetti } from '../src/components/Fx';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { storyById, type Story } from '../src/data/stories';
import { EXPRESSIONS, exprById, exprMeaning, exprTarget } from '../src/data/expressions';
import type { LangCode } from '../src/data/languages';
import { haptic, speak } from '../src/lib/feedback';
import { goBack } from '../src/lib/nav';

type Step =
  | { k: 'line'; i: number }
  | { k: 'say'; i: number; options: string[] }
  | { k: 'meant'; i: number; options: string[] };

const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);

/** A story becomes a sequence: lines appear one by one, with a question every other line. */
function stepsOf(story: Story): Step[] {
  const ids = story.lines.map(([, id]) => `ph:${id}`);
  const group = exprById(ids[0])?.group;
  const others = (id: string) => shuffle([...new Set([...ids, ...EXPRESSIONS.filter((e) => e.kind === 'phrase' && e.group === group).map((e) => e.id)])].filter((x) => x !== id)).slice(0, 2);
  const out: Step[] = [];
  story.lines.forEach(([who, id], i) => {
    const full = `ph:${id}`;
    const ask = i > 0 && i % 2 === 1;
    if (ask && who === 'fox') out.push({ k: 'say', i, options: shuffle([full, ...others(full)]) });
    // their line comes together with the question about it
    if (ask && who === 'npc') out.push({ k: 'meant', i, options: shuffle([full, ...others(full)]) });
    else out.push({ k: 'line', i });
  });
  return out;
}

export default function StoryScreen() {
  const { c, isDark } = useTheme();
  const { t, code } = useT();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const story = storyById(id ?? '');
  const s = useApp((x) => x.settings);
  const target = s.active;
  const native = s.native === target ? (target === 'en' ? 'uk' : 'en') : s.native;
  const female = s.speakerGender === 'female';
  const steps = useMemo(() => (story ? stepsOf(story) : []), [story?.id]);
  const [at, setAt] = useState(0);
  const [shown, setShown] = useState<number[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [done, setDone] = useState<null | number>(null);
  const correct = useRef(0);
  const questions = useRef(0);
  const started = useRef(Date.now());
  const scroll = useRef<{ scrollToEnd: (o?: { animated?: boolean }) => void } | null>(null);
  const L = (o: { en: string; uk: string }) => (code === 'uk' ? o.uk : o.en);

  useEffect(() => {
    if (!story) router.replace('/stories');
  }, [!!story]);

  const step = steps[at];
  // a line appears and is read aloud as soon as we get to it
  useEffect(() => {
    if (!story || !step || step.k === 'say') return;
    setShown((x) => (x.includes(step.i) ? x : [...x, step.i]));
    const text = exprTarget(exprById(`ph:${story.lines[step.i][1]}`)!, target, female).text;
    setTimeout(() => speak(text, target), 150);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
  }, [at]);

  if (!story) return null;
  const textOf = (phrase: string) => exprTarget(exprById(phrase)!, target, female);
  const meaningOf = (phrase: string) => exprMeaning(exprById(phrase)!, native as LangCode, female);

  const next = () => {
    setPick(null);
    if (at + 1 >= steps.length) {
      const min = Math.max(1, Math.round((Date.now() - started.current) / 60000));
      haptic.success();
      setDone(useApp.getState().finishStory(`${target}:${story.id}`, { correct: correct.current, total: Math.max(1, questions.current), minutes: min, phrases: story.lines.map(([, p]) => `ph:${p}`) }));
      return;
    }
    setAt(at + 1);
  };

  const answer = (o: string) => {
    if (pick || !step || step.k === 'line') return;
    setPick(o);
    questions.current++;
    const right = `ph:${story.lines[step.i][1]}`;
    if (o === right) { correct.current++; haptic.success(); } else haptic.error();
  };

  if (done != null) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', padding: space.l, paddingBottom: insets.bottom + 16 }}>
        <Confetti count={80} />
        <Animated.View entering={ZoomIn.springify().damping(12)}><Mascot size={130} mood="dance" /></Animated.View>
        <Txt style={{ fontFamily: fonts.serif, fontSize: 36, lineHeight: 42, color: c.text, textAlign: 'center', marginTop: 12 }}>{t('stories.done')}</Txt>
        <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 6, maxWidth: 340 }}>{t('stories.doneSub', { n: story.lines.length })}</Txt>
        <View style={[styles.xp, { backgroundColor: '#F59E0B' }]}><Txt v="headline" color="#fff">+{done} XP</Txt></View>
        <View style={{ alignSelf: 'stretch', marginTop: 28, maxWidth: 460, width: '100%' }}>
          <ChunkyButton title={t('common.continue')} color="#2FB574" onPress={() => goBack('/stories')} />
        </View>
      </View>
    );
  }

  const right = step && step.k !== 'line' ? `ph:${story.lines[step.i][1]}` : '';
  const npcName = L(story.npc.name);
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack('/stories')} hitSlop={12} accessibilityLabel={t('common.close')}><X size={24} color={c.textSecondary} /></Pressable>
        <View style={{ flex: 1 }}><ProgressBar value={at / steps.length} color="#8B5CF6" height={12} /></View>
      </View>
      <ScrollView ref={scroll as never} contentContainerStyle={{ padding: space.m, paddingBottom: 24, maxWidth: 620, width: '100%', alignSelf: 'center' }}>
        <View style={[styles.hero, { backgroundColor: isDark ? 'rgba(139,92,246,.16)' : '#F1EBFF' }]}>
          <EmojiArt emoji={story.scene} size={64} />
          <Txt style={{ fontFamily: fonts.serif, fontSize: 26, lineHeight: 30, color: c.text, marginTop: 6, textAlign: 'center' }}>{L(story.title)}</Txt>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
            <View style={styles.castItem}><FoxArt size={28} /><Txt v="caption" color={c.textSecondary}>{t('stories.tingo')}</Txt></View>
            <View style={styles.castItem}><EmojiArt emoji={story.npc.emoji} size={28} /><Txt v="caption" color={c.textSecondary}>{npcName}</Txt></View>
          </View>
        </View>

        {story.lines.map(([who, p], i) => {
          if (!shown.includes(i)) return null;
          const full = `ph:${p}`;
          const tx = textOf(full);
          const fox = who === 'fox';
          return (
            <Animated.View key={i} entering={FadeInUp.springify().damping(18)} style={[styles.lineRow, fox && { flexDirection: 'row-reverse' }]}>
              {fox ? <FoxArt size={40} /> : <EmojiArt emoji={story.npc.emoji} size={40} />}
              <Pressable onPress={() => { speak(tx.text, target); setRevealed((r) => (r.includes(i) ? r : [...r, i])); }}
                style={[styles.bubble, { backgroundColor: fox ? (isDark ? 'rgba(47,181,116,.16)' : '#E7F8EE') : c.surface, borderColor: c.divider }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Volume2 size={16} color={c.textTertiary} style={{ marginTop: 4 }} />
                  <View style={{ flex: 1 }}>
                    <Txt style={{ fontFamily: fonts.medium, fontSize: 17, lineHeight: 24, color: c.text }}>{tx.text}</Txt>
                    {tx.roman ? <Txt v="caption" color={c.textTertiary}>{tx.roman}</Txt> : null}
                    {revealed.includes(i) ? <Txt v="caption" color={c.textSecondary} style={{ marginTop: 4 }}>{meaningOf(full)}</Txt> : null}
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}

        {step && step.k !== 'line' && (
          <Animated.View key={at} entering={FadeInDown.springify()} style={[styles.q, { backgroundColor: c.surfaceAlt }]}>
            <Txt v="headline">{step.k === 'say' ? t('stories.whatSay') : t('stories.whatMeant', { name: npcName })}</Txt>
            <View style={{ gap: 8, marginTop: 12 }}>
              {step.options.map((o) => {
                const isRight = o === right;
                const on = pick === o;
                const bg = pick ? (isRight ? '#2FB574' : on ? '#EF4444' : c.surface) : c.surface;
                return (
                  <Pressable key={o} onPress={() => answer(o)} style={[styles.opt, { backgroundColor: bg, borderColor: c.divider }]}>
                    <Txt v="bodyMedium" color={pick && (isRight || on) ? '#fff' : c.text} style={{ flex: 1 }}>{step.k === 'say' ? textOf(o).text : meaningOf(o)}</Txt>
                    {pick && isRight ? <Check size={18} color="#fff" strokeWidth={3} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        )}
      </ScrollView>
      <View style={{ padding: space.m, paddingBottom: insets.bottom + 14, maxWidth: 620, width: '100%', alignSelf: 'center' }}>
        <ChunkyButton
          title={t('common.continue')}
          color="#8B5CF6"
          disabled={!!step && step.k !== 'line' && !pick}
          onPress={next}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 56, paddingHorizontal: 16, maxWidth: 680, width: '100%', alignSelf: 'center' },
  hero: { alignItems: 'center', padding: 18, borderRadius: radius.xl, marginBottom: 14 },
  castItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lineRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12 },
  bubble: { flex: 1, maxWidth: '82%', padding: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  q: { marginTop: 18, padding: 16, borderRadius: radius.l },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.m, borderWidth: 1.5 },
  xp: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14 },
});
