import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { X, Zap } from '../src/components/icons';
import { Txt } from '../src/components/ui';
import { EmojiArt } from '../src/components/NoteBits';
import { TimerRing } from '../src/components/Overlay';
import { ChunkyButton, Mascot } from '../src/components/PathBits';
import { fonts, radius, space } from '../src/theme/tokens';
import { useT, languageName } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { CONCEPTS, conceptById, fullWord, labelOf } from '../src/data/concepts';
import { NODES } from '../src/data/path';
import type { LangCode } from '../src/data/languages';
import { haptic, speak } from '../src/lib/feedback';
import { goBack } from '../src/lib/nav';

const SECONDS = 60;
const PENALTY = 3;

type Q = { word: string; reverse: boolean; options: string[] };

/** Words the learner has met: saved words and words from finished path lessons; level words as a fallback. */
function poolFor(target: string) {
  const s = useApp.getState();
  const met = new Set<string>(Object.keys(s.words));
  NODES.forEach((n) => { if (s.path[`${target}:${n.id}`]) n.words.forEach((w) => met.add(w)); });
  const level = s.settings.cefr ?? 'A1';
  const ids = [...met].filter((id) => conceptById(id));
  if (ids.length >= 12) return ids;
  return [...new Set([...ids, ...CONCEPTS.filter((c) => c.level === level || c.level === 'A1').map((c) => c.id)])].slice(0, 200);
}

function makeQ(pool: string[], target: LangCode, native: LangCode, last?: string): Q {
  let word = pool[Math.floor(Math.random() * pool.length)];
  if (word === last && pool.length > 1) word = pool[(pool.indexOf(word) + 1) % pool.length];
  const c = conceptById(word)!;
  const seen = new Set([labelOf(word, target)?.word, labelOf(word, native)?.word]);
  const near = [...pool, ...CONCEPTS.filter((x) => x.topic === c.topic).map((x) => x.id)].sort(() => Math.random() - 0.5);
  const opts: string[] = [];
  for (const id of near) {
    if (opts.length >= 3) break;
    const a = labelOf(id, target)?.word;
    const b = labelOf(id, native)?.word;
    if (id === word || !a || !b || seen.has(a) || seen.has(b)) continue;
    seen.add(a); seen.add(b); opts.push(id);
  }
  return { word, reverse: Math.random() < 0.4, options: [word, ...opts].sort(() => Math.random() - 0.5) };
}

/** Lightning: as many words as you can in 60 seconds. Streaks multiply points, mistakes cost 3 seconds. */
export default function Lightning() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const s = useApp((x) => x.settings);
  const best = useApp((x) => x.lightningBest[x.settings.active] ?? 0);
  const target = s.active;
  const native = s.native === target ? (target === 'en' ? 'uk' : 'en') : s.native;
  const pool = useMemo(() => poolFor(target), [target]);
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [left, setLeft] = useState(SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [q, setQ] = useState<Q>(() => makeQ(pool, target, native));
  const [flash, setFlash] = useState<null | { id: string; ok: boolean }>(null);
  const [result, setResult] = useState<null | { xp: number; best: number; record: boolean }>(null);
  const answered = useRef(0);
  const missed = useRef<string[]>([]);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const mult = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;

  useEffect(() => {
    if (phase !== 'play') return;
    const id = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === 'play' && left <= 0) {
      setPhase('done');
      haptic.success();
      setResult(useApp.getState().finishLightning(target, { score, total: answered.current, minutes: 1 }));
    }
  }, [left, phase]);

  const pick = (id: string) => {
    if (flash || phase !== 'play') return;
    answered.current++;
    const ok = id === q.word;
    setFlash({ id, ok });
    if (ok) {
      haptic.light();
      const c = combo + 1;
      setCombo(c);
      setMaxCombo((m) => Math.max(m, c));
      setScore((x) => x + (c >= 10 ? 3 : c >= 5 ? 2 : 1));
    } else {
      haptic.error();
      setCombo(0);
      setLeft((x) => Math.max(0, x - PENALTY));
      missed.current = [...new Set([...missed.current, q.word])];
      shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(0, { duration: 50 }));
    }
    setTimeout(() => {
      setFlash(null);
      setQ((prev) => makeQ(pool, target, native, prev.word));
    }, ok ? 180 : 450);
  };

  const start = () => {
    haptic.light();
    setScore(0); setCombo(0); setMaxCombo(0); setLeft(SECONDS); answered.current = 0; missed.current = []; setResult(null);
    setQ(makeQ(pool, target, native));
    setPhase('play');
  };

  return (
    <LinearGradient colors={['#1B1446', '#3B1E8F', '#6D28D9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack('/(tabs)/path')} hitSlop={12} accessibilityLabel={t('common.close')}><X size={24} color="rgba(255,255,255,.8)" /></Pressable>
        <View style={{ flex: 1 }} />
        {phase === 'play' && <Txt v="headline" color="#fff" style={{ fontVariant: ['tabular-nums'] }}>{score}</Txt>}
      </View>

      {phase === 'intro' && (
        <View style={styles.center}>
          <Animated.View entering={ZoomIn.springify()} style={styles.bolt}><Zap size={64} color="#FDE047" fill="#FDE047" /></Animated.View>
          <Txt style={styles.big}>{t('lightning.title')}</Txt>
          <Txt v="body" color="rgba(255,255,255,.8)" center style={{ marginTop: 8, maxWidth: 340 }}>{t('lightning.sub', { lang: languageName(target, s.uiLang) })}</Txt>
          <View style={styles.rules}>
            {[t('lightning.rule1'), t('lightning.rule2'), t('lightning.rule3')].map((r) => <Txt key={r} v="callout" color="#fff">{r}</Txt>)}
          </View>
          {best > 0 && <Txt v="captionMedium" color="#FDE047" style={{ marginTop: 18 }}>{t('lightning.best', { n: best })}</Txt>}
          <View style={{ alignSelf: 'stretch', marginTop: 28, maxWidth: 420, width: '100%' }}>
            <ChunkyButton title={t('lightning.go')} color="#F59E0B" onPress={start} />
          </View>
        </View>
      )}

      {phase === 'play' && (
        <View style={{ flex: 1, paddingHorizontal: space.l, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <TimerRing size={92} width={7} progress={left / SECONDS} color={left <= 10 ? '#F87171' : '#FDE047'}>
              <Txt style={{ fontFamily: fonts.semibold, fontSize: 30, color: '#fff', fontVariant: ['tabular-nums'] }}>{left}</Txt>
            </TimerRing>
            <View style={{ height: 30, justifyContent: 'center' }}>
              {mult > 1 && <Animated.View key={mult} entering={ZoomIn}><Txt v="headline" color="#FDE047">🔥 ×{mult}</Txt></Animated.View>}
            </View>
          </View>
          <Animated.View key={`${q.word}${q.reverse}`} entering={FadeIn.duration(150)} style={[styles.card, shakeStyle]}>
            <EmojiArt emoji={conceptById(q.word)?.emoji} size={58} />
            <Txt style={{ fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, color: '#fff', textAlign: 'center', marginTop: 8 }}>
              {q.reverse ? labelOf(q.word, native)?.word : fullWord(q.word, target)}
            </Txt>
          </Animated.View>
          <View style={styles.grid}>
            {q.options.map((o) => {
              const f = flash && (flash.id === o || (!flash.ok && o === q.word));
              const bg = f ? (o === q.word ? '#22C55E' : '#EF4444') : 'rgba(255,255,255,.12)';
              return (
                <Pressable key={o} onPress={() => { pick(o); if (!q.reverse) return; speak(fullWord(o, target), target); }} style={[styles.opt, { backgroundColor: bg }]}>
                  <Txt v="bodyMedium" color="#fff" center numberOfLines={2}>{q.reverse ? fullWord(o, target) : labelOf(o, native)?.word}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {phase === 'done' && result && (
        <View style={styles.center}>
          <Animated.View entering={ZoomIn.springify().damping(12)}><Mascot size={120} /></Animated.View>
          {result.record && <Animated.View entering={FadeInDown.delay(200)} style={styles.record}><Txt v="overline" color="#1B1446">{t('lightning.record')}</Txt></Animated.View>}
          <Txt style={styles.big}>{score}</Txt>
          <Txt v="body" color="rgba(255,255,255,.8)">{t('lightning.points')}</Txt>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            {[[t('lightning.bestShort'), result.best], [t('lightning.combo'), maxCombo], ['XP', `+${result.xp}`]].map(([k, v]) => (
              <View key={String(k)} style={styles.stat}><Txt v="overline" color="rgba(255,255,255,.7)">{k}</Txt><Txt v="headline" color="#fff">{v}</Txt></View>
            ))}
          </View>
          {missed.current.length > 0 && (
            <View style={styles.missed}>
              <Txt v="overline" color="rgba(255,255,255,.7)">{t('lightning.missed')}</Txt>
              <Txt v="callout" color="#fff" style={{ marginTop: 4 }}>{missed.current.slice(0, 8).map((w) => `${fullWord(w, target)} — ${labelOf(w, native)?.word}`).join(' · ')}</Txt>
            </View>
          )}
          <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 24, maxWidth: 420, width: '100%' }}>
            <ChunkyButton title={t('lightning.again')} color="#F59E0B" onPress={start} />
            <Pressable onPress={() => goBack('/(tabs)/path')} style={{ alignItems: 'center', padding: 12 }}><Txt v="bodyMedium" color="rgba(255,255,255,.8)">{t('lightning.done')}</Txt></Pressable>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.l, alignSelf: 'center', width: '100%', maxWidth: 560 },
  bolt: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
  big: { fontFamily: fonts.serif, fontSize: 52, lineHeight: 58, color: '#fff', marginTop: 14, textAlign: 'center' },
  rules: { gap: 8, marginTop: 22, padding: 16, borderRadius: radius.l, backgroundColor: 'rgba(255,255,255,.1)', alignSelf: 'stretch', maxWidth: 420, width: '100%' },
  card: { alignItems: 'center', padding: 22, borderRadius: radius.xl, backgroundColor: 'rgba(255,255,255,.1)', marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  opt: { width: '48%', flexGrow: 1, minHeight: 74, borderRadius: radius.l, alignItems: 'center', justifyContent: 'center', padding: 10 },
  record: { backgroundColor: '#FDE047', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginTop: 10 },
  stat: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.m, backgroundColor: 'rgba(255,255,255,.1)', minWidth: 90 },
  missed: { marginTop: 18, padding: 14, borderRadius: radius.m, backgroundColor: 'rgba(255,255,255,.08)', alignSelf: 'stretch' },
});
