import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown, SlideInRight, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Mic, Volume2, X } from '../src/components/icons';
import { Txt, Button, ProgressBar } from '../src/components/ui';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { languageName } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { exprById, exprLang, exprMeaning, exprTarget, exprsOfKind, type Expr } from '../src/data/expressions';
import { lang } from '../src/data/languages';
import { listenOnce, similarity, speechRecognitionAvailable } from '../src/lib/speech';
import { PronunciationDiff } from '../src/components/Pronunciation';
import { isDue, type Answer } from '../src/lib/srs';
import { speak, haptic } from '../src/lib/feedback';
import { goBack } from '../src/lib/nav';

/** Flashcards for saved phrases and expressions: meaning → recall → reveal → rate (FSRS). */
export default function PhraseReview() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { all } = useLocalSearchParams<{ all?: string }>();
  const s = useApp((x) => x.settings);
  const started = useRef(Date.now());
  const logged = useRef(false);

  const queue = useMemo(() => {
    const ex = useApp.getState().exprs;
    const ids = Object.entries(ex)
      .filter(([, v]) => all || isDue(v.card))
      .sort((a, b) => new Date(a[1].card.due).getTime() - new Date(b[1].card.due).getTime())
      .map(([id]) => id)
      .filter((id) => exprById(id));
    return ids.slice(0, Math.max(10, s.dailyMinutes * 4));
  }, []);

  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const minutes = () => Math.max(1, Math.round((Date.now() - started.current) / 60000));

  const leave = () => {
    if (!logged.current && idx > 0) { logged.current = true; useApp.getState().logSession(idx, correct, minutes()); }
    goBack('/phrases');
  };

  const rate = (a: Answer) => {
    const id = queue[idx];
    useApp.getState().answerExpr(id, a);
    const ok = a !== 'again';
    if (ok) setCorrect((n) => n + 1);
    haptic.light();
    if (idx + 1 >= queue.length) {
      logged.current = true;
      useApp.getState().logSession(queue.length, correct + (ok ? 1 : 0), minutes());
      setDone(true);
      haptic.success();
    } else {
      setIdx(idx + 1);
      setShown(false);
    }
  };

  if (!queue.length || done) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: space.l }}>
        <Animated.View entering={ZoomIn.springify()} style={[styles.doneIc, { backgroundColor: c.successSoft }]}><Check size={34} color={c.success} /></Animated.View>
        <Txt v="headline" center style={{ marginTop: 16 }}>{done ? t('phr.done') : t('phr.nothingSaved')}</Txt>
        {done && <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 6 }}>{t('phr.doneSub', { n: queue.length })}</Txt>}
        <Button title={t('common.done')} onPress={() => goBack('/phrases')} style={{ marginTop: 24, minWidth: 220 }} />
      </View>
    );
  }

  const e = exprById(queue[idx])!;
  const target = exprTarget(e, s.active, s.speakerGender === 'female');
  const code = exprLang(e, s.active);
  const female = s.speakerGender === 'female';
  const tokens = target.text.split(/\s+/).filter(Boolean);
  // three ways to practise: recall from meaning, build from tiles, recognise by ear
  let mode: 'recall' | 'build' | 'listen' = (['recall', 'build', 'listen'] as const)[idx % 3];
  if (mode === 'build' && (tokens.length < 3 || tokens.length > 10)) mode = 'recall';

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top, paddingBottom: insets.bottom + 12 }}>
      <View style={styles.top}>
        <Pressable onPress={leave} hitSlop={12}><X size={24} color={c.text} /></Pressable>
        <View style={{ flex: 1 }}><ProgressBar value={idx / queue.length} height={6} /></View>
        <Txt v="captionMedium" color={c.textSecondary}>{idx + 1}/{queue.length}</Txt>
      </View>
      <Animated.View key={idx} entering={SlideInRight.springify().damping(20)} style={{ flex: 1, padding: space.l, maxWidth: 560, width: '100%', alignSelf: 'center', justifyContent: 'center' }}>
        {mode === 'listen' && !shown ? (
          <ListenPick key={idx} e={e} target={target.text} code={code} onDone={() => setShown(true)} />
        ) : (
          <>
            <Txt v="overline" color={c.textSecondary}>{mode === 'build' ? t('phr.build') : t('phr.remember', { lang: languageName(code, s.uiLang) })}</Txt>
            <Txt style={{ fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, color: c.text, marginTop: 10 }}>{exprMeaning(e, s.native, female)}</Txt>
          </>
        )}
        {mode === 'build' && !shown ? <BuildIt key={idx} tokens={tokens} onDone={() => { setShown(true); speak(target.text, code); }} /> : null}
        {e.kind !== 'phrase' && e.exEn && !shown ? (
          <Txt v="callout" color={c.textTertiary} style={{ marginTop: 12, fontStyle: 'italic' }}>{e.exEn.replace(new RegExp(e.en.split(' ')[0], 'i'), '____')}</Txt>
        ) : null}
        {shown ? (
          <Animated.View entering={FadeInDown.springify()} style={[styles.answer, { backgroundColor: c.surface, borderColor: c.divider }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Txt style={{ fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, color: c.accent, flex: 1 }}>{target.text}</Txt>
              <Pressable onPress={() => speak(target.text, code)} hitSlop={8} style={[styles.round, { backgroundColor: c.surfaceAlt }]}><Volume2 size={18} color={c.text} /></Pressable>
            </View>
            {'roman' in target && target.roman ? <Txt v="caption" color={c.textTertiary}>{target.roman}</Txt> : null}
            <SayIt key={idx} text={target.text} code={code} />
            {e.exEn ? <Txt v="body" style={{ marginTop: 10, fontStyle: 'italic' }}>{e.exEn}</Txt> : null}
            {e.exUk && s.native === 'uk' ? <Txt v="caption" color={c.textSecondary}>{e.exUk}</Txt> : null}
          </Animated.View>
        ) : null}
      </Animated.View>
      <View style={{ paddingHorizontal: space.l, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        {shown ? (
          <Animated.View entering={FadeIn} style={{ flexDirection: 'row', gap: 8 }}>
            {(['again', 'hard', 'good', 'easy'] as Answer[]).map((a) => (
              <Button key={a} title={t(`phr.${a}`)} size="m" variant={a === 'good' ? 'primary' : a === 'again' ? 'danger' : 'secondary'} style={{ flex: 1, paddingHorizontal: 4 }} onPress={() => rate(a)} />
            ))}
          </Animated.View>
        ) : mode === 'recall' ? (
          <Button title={t('phr.show')} onPress={() => { setShown(true); speak(target.text, code); }} />
        ) : null}
      </View>
    </View>
  );
}

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

/** Put the phrase together from shuffled word tiles. */
function BuildIt({ tokens, onDone }: { tokens: string[]; onDone: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const bank = useMemo(() => shuffle(tokens.map((w, i) => ({ w, i }))), [tokens]);
  const [built, setBuilt] = useState<{ w: string; i: number }[]>([]);
  const [result, setResult] = useState<null | boolean>(null);
  const check = () => {
    const ok = built.map((b) => b.w).join(' ') === tokens.join(' ');
    setResult(ok);
    if (ok) haptic.success(); else haptic.error();
    setTimeout(onDone, 700);
  };
  return (
    <View style={{ marginTop: 18, gap: 14 }}>
      <View style={[styles.line, { borderColor: result === null ? c.divider : result ? c.success : c.error }]}>
        {built.map((b) => (
          <Pressable key={b.i} onPress={() => result === null && setBuilt((x) => x.filter((y) => y.i !== b.i))} style={[styles.tile, { backgroundColor: c.ink }]}>
            <Txt v="bodyMedium" color={c.background}>{b.w}</Txt>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {bank.filter((b) => !built.some((x) => x.i === b.i)).map((b) => (
          <Pressable key={b.i} onPress={() => setBuilt((x) => [...x, b])} style={[styles.tile, { backgroundColor: c.surface, borderColor: c.divider, borderWidth: StyleSheet.hairlineWidth }]}>
            <Txt v="bodyMedium">{b.w}</Txt>
          </Pressable>
        ))}
      </View>
      <Button title={t('phr.check')} disabled={built.length !== tokens.length || result !== null} onPress={check} />
    </View>
  );
}

/** Hear the phrase, pick what it means. */
function ListenPick({ e, target, code, onDone }: { e: Expr; target: string; code: Parameters<typeof speak>[1]; onDone: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const s = useApp((x) => x.settings);
  const female = s.speakerGender === 'female';
  const options = useMemo(() => shuffle([e, ...shuffle(exprsOfKind(e.kind).filter((x) => x.id !== e.id)).slice(0, 3)]), [e.id]);
  const [picked, setPicked] = useState<string | null>(null);
  React.useEffect(() => { const id = setTimeout(() => speak(target, code), 350); return () => clearTimeout(id); }, []);
  return (
    <View>
      <Txt v="overline" color={c.textSecondary}>{t('phr.listen')}</Txt>
      <Pressable onPress={() => speak(target, code)} style={[styles.bigPlay, { backgroundColor: c.ink }]}><Volume2 size={34} color={c.background} /></Pressable>
      <View style={{ gap: 8, marginTop: 18 }}>
        {options.map((o) => {
          const isRight = o.id === e.id;
          const state = picked === null ? 'idle' : isRight ? 'right' : picked === o.id ? 'wrong' : 'idle';
          return (
            <Pressable key={o.id} disabled={picked !== null} onPress={() => { setPicked(o.id); if (isRight) haptic.success(); else haptic.error(); setTimeout(onDone, 800); }}
              style={[styles.option, { borderColor: state === 'right' ? c.success : state === 'wrong' ? c.error : c.divider, backgroundColor: state === 'right' ? c.successSoft : state === 'wrong' ? c.errorSoft : c.surface }]}>
              <Txt v="body">{exprMeaning(o, s.native, female)}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Say the phrase aloud and see which sounds came through. */
function SayIt({ text, code }: { text: string; code: Parameters<typeof speak>[1] }) {
  const { c } = useTheme();
  const { t } = useT();
  const [state, setState] = useState<{ heard: string; score: number } | null>(null);
  const [listening, setListening] = useState(false);
  if (!speechRecognitionAvailable()) return null;
  return (
    <View style={{ marginTop: 12, gap: 8 }}>
      {state ? <PronunciationDiff heard={state.heard} target={text} score={state.score} /> : null}
      <Button
        title={listening ? t('word.listening') : t('pron.say')}
        variant="secondary"
        size="m"
        loading={listening}
        icon={<Mic size={16} color={c.text} />}
        onPress={() => { setListening(true); listenOnce(lang(code).voice, (h) => setState({ heard: h, score: similarity(h, text) }), () => setListening(false)); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  line: { minHeight: 56, borderBottomWidth: 2, flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  tile: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12 },
  bigPlay: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 16 },
  option: { padding: 14, borderRadius: radius.m, borderWidth: 1.5 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 52 },
  answer: { marginTop: 24, padding: 18, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  round: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  doneIc: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
});
