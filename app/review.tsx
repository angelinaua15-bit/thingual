import { PronunciationDiff } from '../src/components/Pronunciation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { goBack } from '../src/lib/nav';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn, FadeInDown, FadeInUp, SlideInRight, SlideOutLeft, ZoomIn, interpolate, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { Check, Mic, Volume2, X } from '../src/components/icons';
import { Button, PressableScale, ProgressBar, Txt } from '../src/components/ui';
import { Photo, photoForWord } from '../src/components/Photo';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT, languageName } from '../src/i18n';
import { useApp, SavedWord } from '../src/store/useApp';
import { CONCEPTS, conceptById, fullWord, labelOf } from '../src/data/concepts';
import { lang, LangCode } from '../src/data/languages';
import { Answer, formatInterval, isDue, mastery, preview } from '../src/lib/srs';
import { haptic, speak } from '../src/lib/feedback';
import { listenOnce, similarity, speechRecognitionAvailable } from '../src/lib/speech';

type ExType = 'recall' | 'listen' | 'choose' | 'type' | 'speak' | 'sentence' | 'article';
type Item = { id: string; type: ExType; srs: boolean };

const ARTICLES: Partial<Record<LangCode, string[]>> = {
  de: ['der', 'die', 'das'],
  fr: ['le', 'la', 'l’', 'les'],
  es: ['el', 'la', 'los', 'las'],
  pt: ['o', 'a', 'os', 'as'],
  it: ['il', 'la', 'lo', 'l’', 'gli', 'le'],
};

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, '').trim();

function pickType(w: SavedWord, target: LangCode, forced?: ExType): ExType {
  const c = conceptById(w.conceptId)!;
  const hasSentence = !!(c.examples as Record<string, string | undefined>)[target];
  const hasArticle = !!labelOf(w.conceptId, target)?.article && !!ARTICLES[target];
  if (forced) {
    if (forced === 'sentence' && !hasSentence) return 'recall';
    if (forced === 'article' && !hasArticle) return 'recall';
    return forced;
  }
  const m = mastery(w.card);
  const pool: ExType[] = m === 0 ? ['choose', 'listen', 'recall'] : m === 1 ? ['recall', 'type', 'listen', 'choose'] : ['type', 'recall', 'speak'];
  if (hasSentence && m >= 1) pool.push('sentence');
  if (hasArticle) pool.push('article');
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function Review() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: ExType }>();
  const s = useApp((x) => x.settings);
  const words = useApp((x) => x.words);
  const answerStore = useApp((x) => x.answer);
  const logSession = useApp((x) => x.logSession);
  const started = useRef(Date.now());
  const target = s.active;

  const queue = useMemo<Item[]>(() => {
    const all = Object.values(words);
    const due = all.filter((w) => isDue(w.card)).sort((a, b) => new Date(a.card.due).getTime() - new Date(b.card.due).getTime());
    const fresh = all.filter((w) => mastery(w.card) === 0 && !due.includes(w)).slice(0, 5);
    let pick = [...due, ...fresh];
    if (params.mode && pick.length < 6) pick = [...pick, ...shuffle(all.filter((w) => !pick.includes(w)))];
    const max = Math.max(6, s.dailyMinutes * 4);
    // practice extras that aren't due don't touch the schedule (srs: false)
    return pick.slice(0, max).map((w) => ({ id: w.conceptId, type: pickType(w, target, params.mode), srs: isDue(w.card) || mastery(w.card) === 0 }));
  }, []);

  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const item = queue[idx];

  const logged = useRef(false);
  const minutes = () => Math.max(1, Math.round((Date.now() - started.current) / 60000));
  /** Leaving early still counts the answered cards (streak, sparks, history). */
  const leave = () => {
    if (!logged.current && idx > 0) {
      logged.current = true;
      logSession(idx, correct, minutes());
    }
    goBack();
  };

  const finish = (a: Answer) => {
    if (!item) return;
    if (item.srs) answerStore(item.id, a);
    if (a !== 'again') setCorrect((n) => n + 1);
    if (idx + 1 >= queue.length) {
      logged.current = true;
      logSession(queue.length, correct + (a !== 'again' ? 1 : 0), minutes());
      setDone(true);
      haptic.success();
    } else setIdx(idx + 1);
  };

  if (!queue.length) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: space.l }}>
        <Txt v="headline" center>{t('learn.emptyTitle')}</Txt>
        <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 8, marginBottom: 20 }}>{t('learn.emptySub')}</Txt>
        <Button title={t('learn.backHome')} onPress={() => goBack()} />
      </View>
    );
  }

  if (done) return <Complete total={queue.length} correct={correct} />;

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={styles.top}>
        <Pressable onPress={leave} hitSlop={12}>
          <X size={24} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={idx / queue.length} height={6} />
        </View>
        <Txt v="captionMedium" color={c.textSecondary}>{idx + 1}/{queue.length}</Txt>
      </View>
      <Animated.View key={idx} entering={SlideInRight.springify().damping(20)} exiting={SlideOutLeft.duration(180)} style={{ flex: 1, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        {item.type === 'recall' && <Recall id={item.id} onAnswer={finish} />}
        {(item.type === 'listen' || item.type === 'choose') && <ChoosePhoto id={item.id} listen={item.type === 'listen'} onAnswer={finish} />}
        {item.type === 'type' && <TypeIt id={item.id} onAnswer={finish} />}
        {item.type === 'speak' && <SpeakIt id={item.id} onAnswer={finish} />}
        {item.type === 'sentence' && <Sentence id={item.id} onAnswer={finish} />}
        {item.type === 'article' && <Article id={item.id} onAnswer={finish} />}
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
function useWord(id: string) {
  const s = useApp((x) => x.settings);
  const w = useApp((x) => x.words[id]);
  return { target: s.active, native: s.native, l: labelOf(id, s.active)!, nat: labelOf(id, s.native)!, photo: photoForWord(id, w?.photo, 800), card: w?.card };
}

function Feedback({ ok, word, onNext }: { ok: boolean; word: string; onNext: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  return (
    <Animated.View entering={FadeInUp.springify().damping(18)} style={[styles.feedback, { backgroundColor: ok ? c.successSoft : c.errorSoft }]}>
      <View style={{ flex: 1 }}>
        <Txt v="bodyMedium" color={ok ? c.success : c.error}>{ok ? t('learn.correct') : t('learn.itsActually', { word })}</Txt>
      </View>
      <Button title={t('common.continue')} size="m" variant={ok ? 'primary' : 'danger'} onPress={onNext} />
    </Animated.View>
  );
}

/* 1. Photo → recall the word, flip, self-rate with FSRS intervals */
function Recall({ id, onAnswer }: { id: string; onAnswer: (a: Answer) => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const { height } = useWindowDimensions();
  const { target, l, nat, photo, card } = useWord(id);
  const [flipped, setFlipped] = useState(false);
  const r = useSharedValue(0);
  const front = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: `${interpolate(r.value, [0, 1], [0, 180])}deg` }], backfaceVisibility: 'hidden' }));
  const back = useAnimatedStyle(() => ({ transform: [{ perspective: 1200 }, { rotateY: `${interpolate(r.value, [0, 1], [180, 360])}deg` }], backfaceVisibility: 'hidden' }));
  const prev = card ? preview(card) : null;
  const flip = () => {
    setFlipped(true);
    r.value = withSpring(1, { damping: 16, stiffness: 120 });
    speak(l.word, target);
  };
  const cardH = Math.min(height * 0.52, 480);
  return (
    <View style={{ flex: 1, padding: space.m }}>
      <Txt v="overline" color={c.textSecondary} center style={{ marginBottom: 12 }}>{t('learn.ex.recall')}</Txt>
      <Pressable onPress={flipped ? undefined : flip} style={{ height: cardH }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.flipCard, front]}>
          <Photo uri={photo} style={{ width: '100%', height: '100%' }} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.flipCard, { backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.divider, alignItems: 'center', justifyContent: 'center', padding: 24 }, back]}>
          {l.article ? <Txt v="callout" color={c.textSecondary}>{l.article}</Txt> : null}
          <Txt style={{ fontFamily: fonts.serif, fontSize: 56, lineHeight: 60, color: c.text, textAlign: 'center' }}>{l.word}</Txt>
          {l.roman ? <Txt v="body" color={c.textSecondary}>{l.roman}</Txt> : null}
          <Txt v="body" color={c.textSecondary} style={{ marginTop: 8 }}>{nat.word}</Txt>
          <Pressable onPress={() => speak(l.word, target)} style={[styles.round, { backgroundColor: c.surfaceAlt, marginTop: 18 }]}>
            <Volume2 size={20} color={c.text} />
          </Pressable>
        </Animated.View>
      </Pressable>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {!flipped ? (
          <Button title={t('learn.reveal')} onPress={flip} />
        ) : (
          <Animated.View entering={FadeInUp} style={{ flexDirection: 'row', gap: 8 }}>
            {(['again', 'hard', 'good', 'easy'] as Answer[]).map((a) => (
              <PressableScale key={a} onPress={() => { a === 'again' ? haptic.error() : haptic.success(); onAnswer(a); }} style={[styles.rate, { backgroundColor: a === 'again' ? c.errorSoft : a === 'good' ? c.accentSoft : c.surfaceAlt }]}>
                <Txt v="captionMedium" color={a === 'again' ? c.error : a === 'good' ? c.accent : c.text}>{t(`learn.${a}`)}</Txt>
                {prev && <Txt v="caption" color={c.textSecondary} style={{ fontSize: 11 }}>{formatInterval(prev[a], t)}</Txt>}
              </PressableScale>
            ))}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

/* 2–3. Listen → photo / Word → photo */
function ChoosePhoto({ id, listen, onAnswer }: { id: string; listen: boolean; onAnswer: (a: Answer) => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const { width } = useWindowDimensions();
  const { target, l } = useWord(id);
  const options = useMemo(() => shuffle([id, ...shuffle(CONCEPTS.filter((x) => x.id !== id)).slice(0, 3).map((x) => x.id)]), [id]);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    if (listen) setTimeout(() => speak(l.word, target), 350);
  }, []);
  const tile = (Math.min(width, 560) - space.m * 2 - 12) / 2;
  const ok = picked === id;
  return (
    <View style={{ flex: 1, padding: space.m }}>
      <Txt v="overline" color={c.textSecondary} center>{t(listen ? 'learn.ex.listen' : 'learn.ex.choose')}</Txt>
      <View style={{ alignItems: 'center', marginVertical: 18 }}>
        {listen ? (
          <PressableScale onPress={() => speak(l.word, target)} style={[styles.bigAudio, { backgroundColor: c.accent }]}>
            <Volume2 size={34} color="#fff" />
          </PressableScale>
        ) : (
          <Txt style={{ fontFamily: fonts.serif, fontSize: 48, color: c.text, textAlign: 'center' }}>{fullWord(id, target)}</Txt>
        )}
        <Txt v="callout" color={c.textSecondary} style={{ marginTop: 10 }}>{listen ? t('learn.whatDoYouHear') : t('learn.whichPhoto', { word: l.word })}</Txt>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {options.map((o) => {
          const show = picked !== null && (o === id || o === picked);
          return (
            <PressableScale key={o} onPress={() => { if (picked) return; setPicked(o); o === id ? haptic.success() : haptic.error(); speak(labelOf(id, target)!.word, target); }} style={{ width: tile, height: tile * 0.9, borderRadius: radius.l, overflow: 'hidden', borderWidth: 3, borderColor: show ? (o === id ? c.success : c.error) : 'transparent' }}>
              <Photo uri={photoForWord(o, undefined, 400)} style={{ width: '100%', height: '100%' }} />
              {show && (
                <Animated.View entering={ZoomIn} style={[styles.badge, { backgroundColor: o === id ? c.success : c.error }]}>
                  {o === id ? <Check size={16} color="#fff" /> : <X size={16} color="#fff" />}
                </Animated.View>
              )}
            </PressableScale>
          );
        })}
      </View>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {picked && <Feedback ok={ok} word={fullWord(id, target)} onNext={() => onAnswer(ok ? 'good' : 'again')} />}
      </View>
    </View>
  );
}

/* 4. Type the word */
function TypeIt({ id, onAnswer }: { id: string; onAnswer: (a: Answer) => void }) {
  const { c } = useTheme();
  const { t, code } = useT();
  const { height } = useWindowDimensions();
  const { target, l, nat, photo } = useWord(id);
  const [val, setVal] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const check = () => {
    const okWords = [l.word, fullWord(id, target), l.roman ?? ''].filter(Boolean).map(strip);
    const ok = okWords.includes(strip(val)) || (strip(val).length > 3 && similarity(val, l.word) >= 85);
    setResult(ok);
    if (ok) haptic.success();
    else {
      haptic.error();
      shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(0, { duration: 50 }));
    }
    speak(l.word, target);
  };
  return (
    <View style={{ flex: 1, padding: space.m }}>
      <Txt v="overline" color={c.textSecondary} center style={{ marginBottom: 12 }}>{t('learn.ex.type')}</Txt>
      <View style={{ height: Math.min(height * 0.32, 300), borderRadius: radius.xl, overflow: 'hidden' }}>
        <Photo uri={photo} style={{ width: '100%', height: '100%' }} />
      </View>
      <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 12 }}>{nat.word}</Txt>
      <Animated.View style={[{ marginTop: 14 }, shakeStyle]}>
        <TextInput
          value={val}
          onChangeText={setVal}
          onSubmitEditing={result === null ? check : undefined}
          placeholder={t('learn.typePlaceholder', { lang: languageName(target, code) })}
          placeholderTextColor={c.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          editable={result === null}
          style={[styles.typeInput, { color: c.text, borderColor: result === null ? c.divider : result ? c.success : c.error, backgroundColor: c.surface }]}
        />
      </Animated.View>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {result === null ? <Button title={t('learn.check')} onPress={check} disabled={!val.trim()} /> : <Feedback ok={result} word={fullWord(id, target)} onNext={() => onAnswer(result ? 'good' : 'again')} />}
      </View>
    </View>
  );
}

/* 5. Say the word */
function SpeakIt({ id, onAnswer }: { id: string; onAnswer: (a: Answer) => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const { height } = useWindowDimensions();
  const { target, l, photo } = useWord(id);
  const [score, setScore] = useState<number | null>(null);
  const [heard, setHeard] = useState('');
  const [listening, setListening] = useState(false);
  const available = speechRecognitionAvailable();
  const start = () => {
    if (!available) return;
    setListening(true);
    listenOnce(lang(target).voice, (text) => { setHeard(text); setScore(similarity(text, l.word)); }, () => setListening(false));
  };
  return (
    <View style={{ flex: 1, padding: space.m }}>
      <Txt v="overline" color={c.textSecondary} center style={{ marginBottom: 12 }}>{t('learn.ex.speak')}</Txt>
      <View style={{ height: Math.min(height * 0.34, 320), borderRadius: radius.xl, overflow: 'hidden' }}>
        <Photo uri={photo} style={{ width: '100%', height: '100%' }} />
      </View>
      <View style={{ alignItems: 'center', marginTop: 18 }}>
        <Txt style={{ fontFamily: fonts.serif, fontSize: 44, color: c.text }}>{l.word}</Txt>
        <Pressable onPress={() => speak(l.word, target)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Volume2 size={16} color={c.textSecondary} />
          <Txt v="caption" color={c.textSecondary}>{l.roman ?? languageName(target, 'en')}</Txt>
        </Pressable>
      </View>
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: 12 }}>
        {available ? (
          score === null ? (
            <Button title={listening ? t('word.listening') : t('learn.sayIt', { word: l.word })} icon={<Mic size={18} color={c.onAccent} />} onPress={start} loading={listening} />
          ) : (
            <>
              <PronunciationDiff heard={heard} target={l.word} score={score} />
              {score < 70 && <Button title={t('pron.again')} variant="secondary" size="m" icon={<Mic size={16} color={c.text} />} onPress={() => { setScore(null); start(); }} />}
              <Feedback ok={score >= 70} word={`${l.word} · ${score}%`} onNext={() => onAnswer(score >= 85 ? 'good' : score >= 70 ? 'hard' : 'again')} />
            </>
          )
        ) : (
          <>
            <Txt v="caption" color={c.textSecondary} center>{t('word.pronunciationUnavailable')}</Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['again', 'hard', 'good'] as Answer[]).map((a) => (
                <PressableScale key={a} onPress={() => onAnswer(a)} style={[styles.rate, { backgroundColor: c.surfaceAlt }]}>
                  <Txt v="captionMedium">{t(`learn.${a}`)}</Txt>
                </PressableScale>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

/* 6. Build the sentence */
function Sentence({ id, onAnswer }: { id: string; onAnswer: (a: Answer) => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const { target, native } = useWord(id);
  const concept = conceptById(id)!;
  const ex = (concept.examples as Record<string, string>)[target];
  const translation = (concept.examples as Record<string, string | undefined>)[native] ?? concept.examples.en;
  const tokens = useMemo(() => ex.split(' '), [ex]);
  const bank = useMemo(() => shuffle(tokens.map((w, i) => ({ w, i }))), [tokens]);
  const [built, setBuilt] = useState<{ w: string; i: number }[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const check = () => {
    const ok = built.map((b) => b.w).join(' ') === ex;
    setResult(ok);
    ok ? haptic.success() : haptic.error();
    speak(ex, target);
  };
  return (
    <View style={{ flex: 1, padding: space.m }}>
      <Txt v="overline" color={c.textSecondary} center>{t('learn.buildSentence')}</Txt>
      <Txt v="headline" center style={{ marginTop: 16 }}>{translation}</Txt>
      <View style={[styles.slots, { borderColor: c.divider }]}>
        {built.map((b) => (
          <Animated.View key={b.i} entering={ZoomIn.springify().damping(16)}>
            <Pressable onPress={() => result === null && setBuilt((x) => x.filter((y) => y.i !== b.i))} style={[styles.token, { backgroundColor: c.text }]}>
              <Txt v="bodyMedium" color={c.background}>{b.w}</Txt>
            </Pressable>
          </Animated.View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
        {bank.map((b) => {
          const used = built.some((x) => x.i === b.i);
          return (
            <Pressable key={b.i} disabled={used || result !== null} onPress={() => { haptic.light(); setBuilt((x) => [...x, b]); }} style={[styles.token, { backgroundColor: c.surface, borderWidth: 1, borderColor: c.divider, opacity: used ? 0.25 : 1 }]}>
              <Txt v="bodyMedium">{b.w}</Txt>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {result === null ? <Button title={t('learn.check')} disabled={built.length !== tokens.length} onPress={check} /> : <Feedback ok={result} word={ex} onNext={() => onAnswer(result ? 'good' : 'again')} />}
      </View>
    </View>
  );
}

/* 7. Article & gender */
function Article({ id, onAnswer }: { id: string; onAnswer: (a: Answer) => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const { height } = useWindowDimensions();
  const { target, l, photo } = useWord(id);
  const options = ARTICLES[target] ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const ok = picked === l.article;
  return (
    <View style={{ flex: 1, padding: space.m }}>
      <Txt v="overline" color={c.textSecondary} center style={{ marginBottom: 12 }}>{t('learn.whichArticle')}</Txt>
      <View style={{ height: Math.min(height * 0.32, 300), borderRadius: radius.xl, overflow: 'hidden' }}>
        <Photo uri={photo} style={{ width: '100%', height: '100%' }} />
      </View>
      <Txt style={{ fontFamily: fonts.serif, fontSize: 44, color: c.text, textAlign: 'center', marginTop: 16 }}>
        <Txt style={{ fontFamily: fonts.serif, fontSize: 44, color: picked ? (ok ? c.success : c.error) : c.textTertiary }}>{picked ?? '___'} </Txt>
        {l.word}
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 18 }}>
        {options.map((a) => (
          <PressableScale key={a} onPress={() => { if (picked) return; setPicked(a); a === l.article ? haptic.success() : haptic.error(); speak(fullWord(id, target), target); }} style={[styles.article, { backgroundColor: picked && a === l.article ? c.successSoft : c.surface, borderColor: c.divider }]}>
            <Txt style={{ fontFamily: fonts.serif, fontSize: 24, color: c.text }}>{a}</Txt>
          </PressableScale>
        ))}
      </View>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {picked && <Feedback ok={ok} word={fullWord(id, target)} onNext={() => onAnswer(ok ? 'good' : 'again')} />}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
function Complete({ total, correct }: { total: number; correct: number }) {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const words = useApp((x) => x.words);
  const nextDue = Math.min(...Object.values(words).map((w) => new Date(w.card.due).getTime()));
  const acc = Math.round((correct / Math.max(1, total)) * 100);
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20, paddingHorizontal: space.l, alignItems: 'center' }}>
      <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.doneCircle, { backgroundColor: c.accent }]}>
        <Check size={44} color="#fff" />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(200)} style={{ alignItems: 'center' }}>
        <Txt v="display" center style={{ marginTop: 24 }}>{t('learn.complete')}</Txt>
        <Txt v="body" color={c.textSecondary} style={{ marginTop: 8 }}>{t('learn.completeSub', { n: total, acc })}</Txt>
        {Number.isFinite(nextDue) && (
          <Txt v="caption" color={c.textSecondary} style={{ marginTop: 6 }}>{t('learn.nextAt', { when: t('time.in', { t: formatInterval(Math.max(60000, nextDue - Date.now()), t) }) })}</Txt>
        )}
      </Animated.View>
      <Animated.View entering={FadeIn.delay(400)} style={{ flexDirection: 'row', gap: 10, marginTop: 32 }}>
        <View style={[styles.statBox, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <Txt style={{ fontFamily: fonts.serif, fontSize: 36, color: c.text }}>{total}</Txt>
          <Txt v="caption" color={c.textSecondary}>{t('common.words')}</Txt>
        </View>
        <View style={[styles.statBox, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <Txt style={{ fontFamily: fonts.serif, fontSize: 36, color: c.success }}>{acc}%</Txt>
          <Txt v="caption" color={c.textSecondary}>✓</Txt>
        </View>
      </Animated.View>
      <View style={{ flex: 1 }} />
      <Button title={t('learn.backHome')} onPress={() => goBack()} style={{ alignSelf: 'stretch', maxWidth: 520, width: '100%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: space.m, paddingVertical: 12, maxWidth: 560, width: '100%', alignSelf: 'center' },
  flipCard: { borderRadius: radius.xl, overflow: 'hidden' },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  rate: { flex: 1, height: 58, borderRadius: radius.m, alignItems: 'center', justifyContent: 'center', gap: 2 },
  bigAudio: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.l },
  typeInput: { height: 58, borderRadius: radius.m, borderWidth: 2, paddingHorizontal: 18, fontFamily: fonts.serif, fontSize: 26 },
  slots: { minHeight: 110, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignContent: 'flex-start', paddingVertical: 16, marginTop: 16 },
  token: { paddingHorizontal: 14, height: 42, borderRadius: radius.s, justifyContent: 'center' },
  article: { minWidth: 72, height: 56, paddingHorizontal: 16, borderRadius: radius.m, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  doneCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  statBox: { width: 130, padding: 16, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
});
