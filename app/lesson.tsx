import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, FadeInDown, SlideInDown, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Check, Heart, Timer, Turtle, Volume2, X, Zap } from '../src/components/icons';
import { Txt, Button, ProgressBar, PressableScale } from '../src/components/ui';
import { EmojiArt } from '../src/components/NoteBits';
import { Sheet } from '../src/components/Overlay';
import { ChunkyButton, Mascot, shade, useHearts } from '../src/components/PathBits';
import { Burst, Confetti, CountUp, Floaty } from '../src/components/Fx';
import { SCENERY } from '../src/data/scenery';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT, languageName } from '../src/i18n';
import { useApp, heartsOf } from '../src/store/useApp';
import { conceptById, fullWord, labelOf } from '../src/data/concepts';
import { exprById, exprMeaning, exprTarget } from '../src/data/expressions';
import { lang as langInfo, type LangCode } from '../src/data/languages';
import { UNITS, nodeById } from '../src/data/path';
import { builtOk, makeLesson, typedOk, type Exercise } from '../src/lib/lesson';
import { haptic, speak } from '../src/lib/feedback';
import { goBack } from '../src/lib/nav';

type Verdict = { ok: boolean; typo?: boolean; answer?: string };

/** A path lesson: short exercises one after another, Duolingo-style. */
export default function Lesson() {
  const { c, isDark } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { node: nodeId } = useLocalSearchParams<{ node: string }>();
  const node = nodeById(nodeId ?? '');
  const s = useApp((x) => x.settings);
  const hearts = useHearts();
  const target = s.active;
  const native = s.native === target ? (target === 'en' ? 'uk' : 'en') : s.native;
  const female = s.speakerGender === 'female';
  const [queue, setQueue] = useState<Exercise[]>(() =>
    node ? makeLesson(node, target, native, { female, known: Object.keys(useApp.getState().words) }) : [],
  );
  const total = useRef(queue.length);
  const [i, setI] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [built, setBuilt] = useState<number[]>([]);
  const [typed, setTyped] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [finished, setFinished] = useState<null | { xp: number; acc: number; min: number; perfect: boolean }>(null);
  const [quit, setQuit] = useState(false);
  const [streakRun, setStreakRun] = useState(0);
  const firstTry = useRef(new Set<number>());
  const mistakes = useRef(0);
  const correct = useRef(0);
  const started = useRef(Date.now());
  const ex = queue[i];
  const [lost, setLost] = useState(0);
  const heartShake = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartShake.value }] }));

  useEffect(() => {
    if (!node) router.replace('/(tabs)/path');
  }, [!!node]);

  // listening exercises speak by themselves
  useEffect(() => {
    if (!ex) return;
    const say = sayOf(ex, target, female);
    if ((ex.t === 'listen' || ex.t === 'meaning' || ex.t === 'phrase' || (ex.t === 'build' && ex.listen)) && say) setTimeout(() => speak(say, target), 250);
  }, [i]);

  if (!node || !ex) return finished ? <Done r={finished} onContinue={() => goBack('/(tabs)/path')} /> : null;
  const unit = UNITS[node.unit];
  const accent = unit.color;

  const canCheck = ex.t === 'match' ? false : ex.t === 'build' ? built.length > 0 : ex.t === 'type' ? typed.trim().length > 0 : !!sel;

  const check = () => {
    let v: Verdict;
    if (ex.t === 'build') {
      const picked = built.map((k) => ex.tiles[k]);
      v = { ok: builtOk(picked, ex.answer), answer: ex.say };
    } else if (ex.t === 'type') {
      const r = typedOk(typed, ex.word, target);
      v = { ok: r !== 'wrong', typo: r === 'typo', answer: fullWord(ex.word, target) };
    } else if (ex.t === 'phrase') {
      const e = exprById(ex.phrase)!;
      v = { ok: sel === ex.phrase, answer: exprMeaning(e, native, female) };
    } else if (ex.t === 'match') {
      v = { ok: true };
    } else {
      const w = ex.word;
      v = { ok: sel === w, answer: ex.t === 'meaning' || ex.t === 'pick' ? labelOf(w, native)?.word : fullWord(w, target) };
    }
    grade(v);
  };

  const grade = (v: Verdict) => {
    setVerdict(v);
    if (v.ok) {
      haptic.success();
      if (!firstTry.current.has(i)) correct.current++;
      setStreakRun((n) => n + 1);
      const say = sayOf(ex, target, female);
      if (say && ex.t !== 'listen') speak(say, target);
    } else {
      haptic.error();
      mistakes.current++;
      firstTry.current.add(i);
      setStreakRun(0);
      useApp.getState().loseHeart();
      if (!hearts.unlimited) {
        setLost((n) => n + 1);
        heartShake.value = withSequence(withTiming(1.4, { duration: 120 }), withTiming(0.85, { duration: 120 }), withSpring(1, { damping: 6 }));
      }
      // a missed exercise comes back at the end, like on Duolingo
      setQueue((q) => [...q, ex]);
    }
  };

  const next = () => {
    const outOfHearts = !hearts.unlimited && heartsOf(useApp.getState()).n <= 0 && verdict && !verdict.ok;
    setVerdict(null);
    setSel(null);
    setBuilt([]);
    setTyped('');
    if (outOfHearts) {
      router.replace('/hearts');
      return;
    }
    if (i + 1 >= queue.length) {
      const min = Math.max(1, Math.round((Date.now() - started.current) / 60000));
      const perfect = mistakes.current === 0;
      // missed steps come back and get solved, so accuracy counts first tries only
      const right = Math.max(0, total.current - mistakes.current);
      const xp = useApp.getState().finishNode(`${target}:${node.id}`, { words: node.words, total: total.current, correct: right, minutes: min, perfect });
      setFinished({ xp, acc: Math.round((right / Math.max(1, total.current)) * 100), min, perfect });
      setI(queue.length);
      return;
    }
    setI(i + 1);
  };

  const progress = Math.min(1, correct.current / Math.max(1, total.current));
  const warm = isDark ? 'rgba(47,181,116,0.16)' : '#E7F8EE';
  const bad = isDark ? 'rgba(239,68,68,0.16)' : '#FDECEC';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => setQuit(true)} hitSlop={12} accessibilityLabel={t('common.close')}><X size={24} color={c.textSecondary} /></Pressable>
        <View style={{ flex: 1 }}><ProgressBar value={progress} color={accent} height={14} /></View>
        {streakRun >= 3 && <Animated.View key={streakRun} entering={ZoomIn.springify().damping(8)}><Txt v="captionMedium" color="#F97316">🔥{streakRun}</Txt></Animated.View>}
        <Animated.View style={[styles.hearts, heartStyle]}>
          <Heart size={20} color="#F43F5E" fill="#F43F5E" />
          <Txt v="bodyMedium" color="#F43F5E">{hearts.unlimited ? '∞' : hearts.n}</Txt>
          {lost > 0 && <View key={lost} style={{ position: 'absolute', left: 10, top: 10 }}><Burst emoji="❤️" count={5} size={16} radius={40} /></View>}
        </Animated.View>
      </View>

      {/* the unit's little world, very faint, behind the exercise */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {SCENERY[unit.topic ?? 'mix'].map((e, k) => (
          <Floaty key={e} amp={10} period={3400 + k * 500} delay={k * 300} style={{ position: 'absolute', opacity: isDark ? 0.12 : 0.16, top: `${22 + k * 24}%`, [k % 2 ? 'left' : 'right']: -14 }}>
            <EmojiArt emoji={e} size={96} />
          </Floaty>
        ))}
      </View>

      <ScrollView key={i} contentContainerStyle={{ flexGrow: 1, padding: space.m, paddingBottom: 24, maxWidth: 620, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(260)} style={{ flex: 1 }}>
          <Body ex={ex} target={target} native={native} female={female} sel={sel} setSel={setSel} built={built} setBuilt={setBuilt} typed={typed} setTyped={setTyped}
            locked={!!verdict} onMatched={() => grade({ ok: true })} onSubmit={() => canCheck && !verdict && check()} accent={accent} t={t} />
        </Animated.View>
      </ScrollView>

      {/* bottom: check → verdict → continue */}
      <View style={[styles.foot, { paddingBottom: insets.bottom + 14, backgroundColor: verdict ? (verdict.ok ? warm : bad) : c.background, borderTopColor: verdict ? 'transparent' : c.divider }]}>
        <View style={{ maxWidth: 620, width: '100%', alignSelf: 'center' }}>
          {verdict && (
            <Animated.View entering={SlideInDown.springify().damping(18)} style={{ marginBottom: 12 }}>
              <View style={{ position: 'absolute', right: 0, top: -64 }} pointerEvents="none">
                <Mascot size={60} mood={verdict.ok ? 'happy' : 'sad'} moodKey={i} tappable={false} />
              </View>
              {verdict.ok && <View style={{ position: 'absolute', left: 16, top: 16 }}><Burst emoji={['✨', '⭐', '🌟']} count={10} size={18} radius={90} /></View>}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.mark, { backgroundColor: verdict.ok ? '#2FB574' : '#EF4444' }]}>
                  {verdict.ok ? <Check size={20} color="#fff" strokeWidth={3} /> : <X size={20} color="#fff" strokeWidth={3} />}
                </View>
                <Txt v="headline" color={verdict.ok ? '#1E8E57' : '#DC2626'}>
                  {verdict.ok ? (verdict.typo ? t('lesson.typo') : praise(t, i)) : t('lesson.wrong')}
                </Txt>
              </View>
              {(!verdict.ok || verdict.typo) && verdict.answer ? (
                <Txt v="body" color={verdict.ok ? '#1E8E57' : '#DC2626'} style={{ marginTop: 6 }}>{t('lesson.correctIs')} <Txt v="bodyMedium" color={verdict.ok ? '#1E8E57' : '#DC2626'}>{verdict.answer}</Txt></Txt>
              ) : null}
            </Animated.View>
          )}
          {verdict ? (
            <ChunkyButton title={t('common.continue')} color={verdict.ok ? '#2FB574' : '#EF4444'} onPress={next} />
          ) : ex.t === 'match' ? (
            <Txt v="caption" color={c.textTertiary} center>{t('lesson.matchHint')}</Txt>
          ) : (
            <ChunkyButton title={t('lesson.check')} color={accent} disabled={!canCheck} onPress={check} />
          )}
        </View>
      </View>

      <Sheet visible={quit} onClose={() => setQuit(false)}>
        <View style={{ alignItems: 'center', paddingBottom: 8 }}>
          <Mascot size={72} />
          <Txt v="headline" center style={{ marginTop: 10 }}>{t('lesson.quitTitle')}</Txt>
          <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 4 }}>{t('lesson.quitSub')}</Txt>
          <Button title={t('lesson.keepGoing')} onPress={() => setQuit(false)} style={{ alignSelf: 'stretch', marginTop: 18 }} />
          <Button title={t('lesson.quit')} variant="secondary" onPress={() => { setQuit(false); goBack('/(tabs)/path'); }} style={{ alignSelf: 'stretch', marginTop: 10 }} />
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

type T = (k: string, v?: Record<string, string | number>) => string;
const praise = (t: T, i: number) => [t('lesson.great'), t('lesson.nice'), t('lesson.perfect'), t('lesson.yes')][i % 4];

const sayOf = (ex: Exercise, target: LangCode, female: boolean) =>
  ex.t === 'build' ? ex.say : ex.t === 'phrase' ? exprTarget(exprById(ex.phrase)!, target, female).text : ex.t === 'match' ? '' : fullWord(ex.word, target);

function Word({ id, code, size = 30 }: { id: string; code: LangCode; size?: number }) {
  const { c } = useTheme();
  const l = labelOf(id, code);
  return (
    <View>
      <Txt style={{ fontFamily: fonts.serif, fontSize: size, lineHeight: size * 1.2, color: c.text }}>{fullWord(id, code)}</Txt>
      {langInfo(code).romanize && l?.roman ? <Txt v="callout" color={c.textTertiary}>{l.roman}</Txt> : null}
    </View>
  );
}

function SpeakBig({ text, code, small }: { text: string; code: LangCode; small?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <PressableScale onPress={() => speak(text, code)} style={[small ? styles.spkS : styles.spk, { backgroundColor: '#3B82F6', borderBottomColor: shade('#3B82F6') }]} accessibilityLabel="listen">
        <Volume2 size={small ? 20 : 34} color="#fff" />
      </PressableScale>
      {!small && (
        <PressableScale onPress={() => speak(text, code, { slow: true })} style={[styles.spkSlow, { backgroundColor: c.surfaceAlt }]} accessibilityLabel="slow">
          <Turtle size={22} color={c.text} />
        </PressableScale>
      )}
    </View>
  );
}

type BodyProps = {
  ex: Exercise; target: LangCode; native: LangCode; female: boolean; accent: string; t: T;
  sel: string | null; setSel: (s: string) => void; built: number[]; setBuilt: (b: number[]) => void; typed: string; setTyped: (s: string) => void;
  locked: boolean; onMatched: () => void; onSubmit: () => void;
};

function Body(p: BodyProps) {
  const { c } = useTheme();
  const { ex, target, native, t } = p;
  const tName = languageName(target, useApp.getState().settings.uiLang);

  if (ex.t === 'pick') {
    return (
      <View style={{ flex: 1 }}>
        {ex.isNew && <View style={[styles.newTag, { backgroundColor: '#8B5CF6' }]}><Txt v="overline" color="#fff">{t('lesson.newWord')}</Txt></View>}
        <Txt v="headline">{t('lesson.whichIs')}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <SpeakBig text={fullWord(ex.word, target)} code={target} small />
          <Word id={ex.word} code={target} />
        </View>
        <View style={styles.grid}>
          {ex.options.map((o) => (
            <Option key={o} on={p.sel === o} locked={p.locked} onPress={() => { p.setSel(o); speak(fullWord(o, target), target); }} style={{ width: '47%', flexGrow: 1, alignItems: 'center', paddingVertical: 16 }}>
              <EmojiArt emoji={conceptById(o)?.emoji} size={64} />
              <Txt v="bodyMedium" center style={{ marginTop: 8 }} numberOfLines={2}>{labelOf(o, native)?.word}</Txt>
            </Option>
          ))}
        </View>
      </View>
    );
  }

  if (ex.t === 'meaning' || ex.t === 'listen' || ex.t === 'reverse') {
    const prompt = ex.t === 'meaning' ? t('lesson.whatMeans') : ex.t === 'listen' ? t('lesson.whatHear') : t('lesson.howSay', { lang: tName });
    return (
      <View style={{ flex: 1 }}>
        <Txt v="headline">{prompt}</Txt>
        <View style={[styles.promptRow]}>
          <View style={[styles.art, { backgroundColor: c.surfaceAlt }]}><EmojiArt emoji={ex.t === 'listen' ? '🎧' : conceptById(ex.word)?.emoji} size={56} /></View>
          <View style={{ flex: 1, gap: 8 }}>
            {ex.t === 'listen' ? <SpeakBig text={fullWord(ex.word, target)} code={target} />
              : ex.t === 'meaning' ? (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><SpeakBig text={fullWord(ex.word, target)} code={target} small /><View style={{ flex: 1 }}><Word id={ex.word} code={target} size={28} /></View></View>)
                : <Txt style={{ fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, color: c.text }}>{labelOf(ex.word, native)?.word}</Txt>}
          </View>
        </View>
        <View style={{ gap: 10, marginTop: 8 }}>
          {ex.options.map((o, k) => (
            <Option key={o} on={p.sel === o} locked={p.locked} onPress={() => { p.setSel(o); if (ex.t !== 'meaning') speak(fullWord(o, target), target); }} style={styles.row}>
              <View style={[styles.num, { borderColor: c.divider }]}><Txt v="caption" color={c.textTertiary}>{k + 1}</Txt></View>
              <Txt v="bodyMedium" style={{ flex: 1 }}>{ex.t === 'meaning' ? labelOf(o, native)?.word : fullWord(o, target)}</Txt>
            </Option>
          ))}
        </View>
      </View>
    );
  }

  if (ex.t === 'phrase') {
    const e = exprById(ex.phrase)!;
    const text = exprTarget(e, target, p.female);
    return (
      <View style={{ flex: 1 }}>
        <Txt v="headline">{t('lesson.whatMeans')}</Txt>
        <View style={[styles.bubbleRow]}>
          <Mascot size={70} />
          <View style={[styles.speech, { backgroundColor: c.surface, borderColor: c.divider }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SpeakBig text={text.text} code={target} small />
              <View style={{ flex: 1 }}>
                <Txt style={{ fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: c.text }}>{text.text}</Txt>
                {text.roman ? <Txt v="caption" color={c.textTertiary}>{text.roman}</Txt> : null}
              </View>
            </View>
          </View>
        </View>
        <View style={{ gap: 10, marginTop: 8 }}>
          {ex.options.map((o) => (
            <Option key={o} on={p.sel === o} locked={p.locked} onPress={() => p.setSel(o)} style={styles.row}>
              <Txt v="bodyMedium" style={{ flex: 1 }}>{exprMeaning(exprById(o)!, native, p.female)}</Txt>
            </Option>
          ))}
        </View>
      </View>
    );
  }

  if (ex.t === 'type') {
    return (
      <View style={{ flex: 1 }}>
        <Txt v="headline">{t('lesson.writeIn', { lang: tName })}</Txt>
        <View style={styles.promptRow}>
          <View style={[styles.art, { backgroundColor: c.surfaceAlt }]}><EmojiArt emoji={conceptById(ex.word)?.emoji} size={56} /></View>
          <Txt style={{ flex: 1, fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, color: c.text }}>{labelOf(ex.word, native)?.word}</Txt>
        </View>
        <TextInput
          value={p.typed}
          onChangeText={p.setTyped}
          editable={!p.locked}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('lesson.typeHere')}
          placeholderTextColor={c.textTertiary}
          onSubmitEditing={p.onSubmit}
          returnKeyType="done"
          style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.divider }]}
        />
      </View>
    );
  }

  if (ex.t === 'build') {
    const free = ex.tiles.map((_, k) => k).filter((k) => !p.built.includes(k));
    return (
      <View style={{ flex: 1 }}>
        <Txt v="headline">{ex.listen ? t('lesson.tapHear') : t('lesson.translate')}</Txt>
        <View style={[styles.bubbleRow]}>
          <Mascot size={70} />
          <View style={[styles.speech, { backgroundColor: c.surface, borderColor: c.divider }]}>
            {ex.listen ? <SpeakBig text={ex.say} code={target} /> : <Txt v="bodyMedium" style={{ fontSize: 18, lineHeight: 25 }}>{ex.prompt}</Txt>}
          </View>
        </View>
        <View style={[styles.answer, { borderColor: c.divider }]}>
          {p.built.map((k) => (
            <Tile key={k} text={ex.tiles[k]} onPress={() => !p.locked && p.setBuilt(p.built.filter((x) => x !== k))} />
          ))}
        </View>
        <View style={styles.bank}>
          {ex.tiles.map((w, k) => (
            <Tile key={k} text={w} ghost={!free.includes(k)} onPress={() => { if (p.locked || !free.includes(k)) return; p.setBuilt([...p.built, k]); }} />
          ))}
        </View>
      </View>
    );
  }

  // match pairs
  return <Match words={ex.words} target={target} native={native} t={t} onDone={p.onMatched} />;
}

function Option({ on, locked, onPress, style, children }: { on: boolean; locked: boolean; onPress: () => void; style?: object; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={locked ? undefined : () => { haptic.light(); onPress(); }} scaleTo={0.97}
      style={[styles.opt, { backgroundColor: on ? 'rgba(59,130,246,0.10)' : c.surface, borderColor: on ? '#3B82F6' : c.divider, borderBottomColor: on ? '#2563EB' : c.divider }, style]}>
      {children}
    </PressableScale>
  );
}

function Tile({ text, onPress, ghost }: { text: string; onPress: () => void; ghost?: boolean }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress} scaleTo={0.94} style={[styles.tile, { backgroundColor: ghost ? c.surfaceAlt : c.surface, borderColor: ghost ? 'transparent' : c.divider, borderBottomColor: ghost ? 'transparent' : c.divider }]}>
      <Txt v="bodyMedium" style={{ opacity: ghost ? 0 : 1 }}>{text}</Txt>
    </PressableScale>
  );
}

function Match({ words, target, native, t, onDone }: { words: string[]; target: LangCode; native: LangCode; t: T; onDone: () => void }) {
  const { c } = useTheme();
  const left = useMemo(() => [...words].sort(() => Math.random() - 0.5), [words]);
  const right = useMemo(() => [...words].sort(() => Math.random() - 0.5), [words]);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const shake = useSharedValue(0);
  const sh = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => {
    if (!a || !b) return;
    if (a === b) {
      haptic.success();
      const m = [...matched, a];
      setMatched(m);
      setA(null);
      setB(null);
      if (m.length === words.length) setTimeout(onDone, 250);
    } else {
      haptic.error();
      setWrong([a, `r:${b}`]);
      shake.value = withSequence(withTiming(-6, { duration: 50 }), withTiming(6, { duration: 50 }), withTiming(0, { duration: 50 }));
      setTimeout(() => { setWrong([]); setA(null); setB(null); }, 500);
    }
  }, [a, b]);

  const cell = (id: string, side: 'l' | 'r') => {
    const done = matched.includes(id);
    const on = side === 'l' ? a === id : b === id;
    const bad = wrong.includes(side === 'l' ? id : `r:${id}`);
    return (
      <PressableScale key={side + id} onPress={done ? undefined : () => { if (side === 'l') { setA(id); speak(fullWord(id, target), target); } else setB(id); }}
        style={[styles.cell, { opacity: done ? 0.35 : 1, backgroundColor: bad ? 'rgba(239,68,68,.12)' : on ? 'rgba(59,130,246,.10)' : c.surface, borderColor: bad ? '#EF4444' : on ? '#3B82F6' : c.divider }]}>
        <Txt v="bodyMedium" center numberOfLines={2}>{side === 'l' ? fullWord(id, target) : labelOf(id, native)?.word}</Txt>
      </PressableScale>
    );
  };
  return (
    <View style={{ flex: 1 }}>
      <Txt v="headline">{t('lesson.match')}</Txt>
      <Animated.View style={[{ flexDirection: 'row', gap: 12, marginTop: 18 }, sh]}>
        <View style={{ flex: 1, gap: 10 }}>{left.map((w) => cell(w, 'l'))}</View>
        <View style={{ flex: 1, gap: 10 }}>{right.map((w) => cell(w, 'r'))}</View>
      </Animated.View>
    </View>
  );
}

/** End of the lesson: XP, accuracy, time and the fox. */
function Done({ r, onContinue }: { r: { xp: number; acc: number; min: number; perfect: boolean }; onContinue: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const stats = [
    { label: t('lesson.xp'), value: `+${r.xp}`, color: '#F59E0B', icon: <Zap size={18} color="#fff" fill="#fff" /> },
    { label: t('lesson.accuracy'), value: `${r.acc}%`, color: '#2FB574', icon: <Check size={18} color="#fff" strokeWidth={3} /> },
    { label: t('lesson.time'), value: t('lesson.minutes', { n: r.min }), color: '#3B82F6', icon: <Timer size={18} color="#fff" /> },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top, paddingBottom: insets.bottom + 16, paddingHorizontal: space.l, alignItems: 'center', justifyContent: 'center' }}>
      <Confetti count={r.perfect ? 110 : 70} />
      <View style={styles.sunburst} pointerEvents="none"><Rays color={r.perfect ? '#FDE047' : '#86EFAC'} /></View>
      <Animated.View entering={ZoomIn.springify().damping(12)}><Mascot size={150} mood="dance" /></Animated.View>
      <Animated.View entering={FadeInDown.delay(150)}>
        <Txt style={{ fontFamily: fonts.serif, fontSize: 38, lineHeight: 44, color: c.text, textAlign: 'center', marginTop: 12 }}>{r.perfect ? t('lesson.donePerfect') : t('lesson.done')}</Txt>
        <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 6 }}>{r.perfect ? t('lesson.donePerfectSub') : t('lesson.doneSub')}</Txt>
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 28, width: '100%', maxWidth: 460 }}>
        {stats.map((x, k) => (
          <Animated.View key={x.label} entering={FadeInDown.delay(300 + k * 120).springify()} style={[styles.stat, { borderColor: x.color, backgroundColor: x.color }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}>{x.icon}<Txt v="overline" color="#fff">{x.label}</Txt></View>
            <View style={[styles.statIn, { backgroundColor: c.surface }]}>
              {k === 0 ? <CountUp to={r.xp} prefix="+" style={{ fontFamily: fonts.semibold, fontSize: 20, color: x.color }} /> : k === 1 ? <CountUp to={r.acc} duration={1100} style={{ fontFamily: fonts.semibold, fontSize: 20, color: x.color }} /> : <Txt v="headline" color={x.color}>{x.value}</Txt>}
              {k === 1 ? <Txt v="captionMedium" color={x.color} style={{ position: 'absolute', right: 10, top: 14 }}>%</Txt> : null}
            </View>
          </Animated.View>
        ))}
      </View>
      <View style={{ width: '100%', maxWidth: 460, marginTop: 36 }}>
        <ChunkyButton title={t('common.continue')} color="#2FB574" onPress={onContinue} />
      </View>
    </View>
  );
}

/** Slowly turning rays behind the dancing fox. */
function Rays({ color }: { color: string }) {
  const r = useSharedValue(0);
  useEffect(() => { r.value = withRepeat(withTiming(360, { duration: 16000, easing: Easing.linear }), -1); }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View style={[{ width: 420, height: 420, alignItems: 'center', justifyContent: 'center' }, st]}>
      {Array.from({ length: 12 }, (_, k) => (
        <View key={k} style={{ position: 'absolute', width: 34, height: 420, backgroundColor: color, opacity: 0.18, borderRadius: 17, transform: [{ rotate: `${k * 15}deg` }] }} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sunburst: { position: 'absolute', top: '8%', alignSelf: 'center', alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 56, paddingHorizontal: 16, maxWidth: 680, width: '100%', alignSelf: 'center' },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  foot: { paddingHorizontal: space.m, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  mark: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chunky: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4 },
  newTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  opt: { borderWidth: 2, borderBottomWidth: 4, borderRadius: radius.m, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  num: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 22 },
  art: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  spk: { width: 84, height: 84, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5 },
  spkS: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3 },
  spkSlow: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  input: { marginTop: 4, minHeight: 110, borderRadius: radius.m, borderWidth: 2, padding: 14, fontFamily: fonts.regular, fontSize: 20, textAlignVertical: 'top' },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 18, marginBottom: 18 },
  speech: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 2, marginBottom: 20 },
  answer: { minHeight: 112, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', gap: 8, paddingVertical: 10, borderTopWidth: 2, borderBottomWidth: 2 },
  bank: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 24 },
  tile: { paddingHorizontal: 14, height: 46, borderRadius: 12, borderWidth: 2, borderBottomWidth: 4, justifyContent: 'center' },
  cell: { minHeight: 58, borderRadius: radius.m, borderWidth: 2, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center', padding: 10 },
  stat: { flex: 1, borderRadius: 16, borderWidth: 2, overflow: 'hidden', alignItems: 'center' },
  statIn: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 12, borderRadius: 13 },
});
