import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInDown, SlideInRight, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Volume2, X } from '../../src/components/icons';
import { Txt, Button, ProgressBar } from '../../src/components/ui';
import { useTheme, fonts, radius, space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { ENGLISH_GRAMMAR } from '../../src/data/grammar/english';
import type { GrammarExercise } from '../../src/data/grammar/types';
import { emojiUrl } from '../../src/data/emoji';
import { speak, haptic } from '../../src/lib/feedback';
import { goBack } from '../../src/lib/nav';

const clean = (s: string) => s.trim().toLowerCase().replace(/[’']/g, '’').replace(/\s+/g, ' ').replace(/[.!?]$/, '');

export default function GrammarLesson() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ui = useApp((s) => s.settings.uiLang);
  const lesson = ENGLISH_GRAMMAR.find((g) => g.id === id);
  const [stage, setStage] = useState<'learn' | 'practice' | 'done'>('learn');
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const started = useRef(Date.now());
  if (!lesson) return null;
  const uk = ui === 'uk';
  const ex = lesson.exercises[i];

  const answered = (ok: boolean) => {
    if (ok) { setCorrect((n) => n + 1); haptic.success(); } else haptic.error();
  };
  const next = () => {
    if (i + 1 >= lesson.exercises.length) {
      const score = Math.round((correct / lesson.exercises.length) * 100);
      const st = useApp.getState();
      st.finishGrammar(lesson.id, score);
      st.logSession(lesson.exercises.length, correct, Math.max(1, Math.round((Date.now() - started.current) / 60000)));
      setStage('done');
    } else setI(i + 1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack('/grammar')} hitSlop={12}>{stage === 'practice' ? <X size={22} color={c.text} /> : <ArrowLeft size={22} color={c.text} />}</Pressable>
        {stage === 'practice' ? <View style={{ flex: 1 }}><ProgressBar value={i / lesson.exercises.length} height={6} /></View> : <View style={{ flex: 1 }} />}
        <Txt v="captionMedium" color={c.textSecondary}>{lesson.level}</Txt>
      </View>

      {stage === 'learn' && (
        <ScrollView contentContainerStyle={{ padding: space.m, paddingBottom: insets.bottom + 100, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
          <Animated.View entering={ZoomIn.springify()}><Image source={{ uri: emojiUrl(lesson.emoji) }} style={{ width: 64, height: 64 }} /></Animated.View>
          <Txt style={{ fontFamily: fonts.serif, fontSize: 38, lineHeight: 42, color: c.text, marginTop: 8 }}>{uk ? lesson.title.uk : lesson.title.en}</Txt>
          {uk && <Txt v="callout" color={c.textTertiary}>{lesson.title.en}</Txt>}
          <View style={{ gap: 10, marginTop: 16 }}>
            {(uk ? lesson.explain.uk : lesson.explain.en).map((p, k) => <Txt key={k} v="body" color={c.textSecondary}>{p}</Txt>)}
          </View>
          {lesson.table?.length ? (
            <View style={[styles.table, { borderColor: c.divider, backgroundColor: c.surface }]}>
              {lesson.table.map((row, r) => (
                <View key={r} style={[styles.tr, { borderBottomColor: c.divider, borderBottomWidth: r === lesson.table!.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
                  {row.map((cell, k) => <Txt key={k} v={r === 0 ? 'captionMedium' : 'callout'} style={{ flex: 1 }} color={k === 0 ? c.textSecondary : c.text}>{cell}</Txt>)}
                </View>
              ))}
            </View>
          ) : null}
          <Txt v="overline" color={c.textSecondary} style={{ marginTop: 20, marginBottom: 8 }}>{t('grammar.examples')}</Txt>
          <View style={{ gap: 8 }}>
            {lesson.examples.map((e, k) => (
              <Pressable key={k} onPress={() => speak(e.en, 'en')} style={[styles.example, { backgroundColor: c.surface, borderColor: c.divider }]}>
                <View style={{ flex: 1 }}>
                  <Txt v="bodyMedium">{e.en}</Txt>
                  {uk && <Txt v="caption" color={c.textSecondary}>{e.uk}</Txt>}
                </View>
                <Volume2 size={16} color={c.textTertiary} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
      {stage === 'learn' && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: c.background }]}>
          <Button title={t('grammar.practice', { n: lesson.exercises.length })} onPress={() => setStage('practice')} />
        </View>
      )}

      {stage === 'practice' && ex && (
        <Animated.View key={i} entering={SlideInRight.springify().damping(20)} style={{ flex: 1, padding: space.l, maxWidth: 600, width: '100%', alignSelf: 'center' }}>
          <Exercise ex={ex} uk={uk} onAnswered={answered} onNext={next} />
        </Animated.View>
      )}

      {stage === 'done' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.l, gap: 10 }}>
          <Animated.View entering={ZoomIn.springify()} style={[styles.doneIc, { backgroundColor: c.successSoft }]}><Check size={36} color={c.success} /></Animated.View>
          <Txt style={{ fontFamily: fonts.serif, fontSize: 56, color: c.text }}>{Math.round((correct / lesson.exercises.length) * 100)}%</Txt>
          <Txt v="callout" color={c.textSecondary}>{t('grammar.result', { n: correct, total: lesson.exercises.length })}</Txt>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button title={t('grammar.retry')} variant="secondary" onPress={() => { setI(0); setCorrect(0); setStage('practice'); }} />
            <Button title={t('common.done')} onPress={() => goBack('/grammar')} />
          </View>
        </View>
      )}
    </View>
  );
}

function Exercise({ ex, uk, onAnswered, onNext }: { ex: GrammarExercise; uk: boolean; onAnswered: (ok: boolean) => void; onNext: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<null | boolean>(null);
  const answer = ex.type === 'choice' ? ex.options[ex.answer] : ex.answer;
  const submit = (ok: boolean) => { setResult(ok); onAnswered(ok); speak(ex.q.replace('___', answer), 'en'); };

  return (
    <View style={{ flex: 1 }}>
      <Txt v="overline" color={c.textSecondary}>{ex.type === 'choice' ? t('grammar.choose') : t('grammar.fill')}</Txt>
      <Txt style={{ fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, color: c.text, marginTop: 10 }}>{ex.q}</Txt>
      {uk && ex.uk ? <Txt v="callout" color={c.textTertiary} style={{ marginTop: 6 }}>{ex.uk}</Txt> : null}
      {ex.type === 'gap' && ex.hint ? <Txt v="caption" color={c.textSecondary} style={{ marginTop: 6 }}>💡 {ex.hint}</Txt> : null}

      <View style={{ marginTop: 22, gap: 8 }}>
        {ex.type === 'choice' ? (
          ex.options.map((o, k) => {
            const state = result === null ? (picked === k ? 'sel' : 'idle') : k === ex.answer ? 'right' : picked === k ? 'wrong' : 'idle';
            return (
              <Pressable key={k} disabled={result !== null} onPress={() => { setPicked(k); submit(k === ex.answer); }}
                style={[styles.option, { borderColor: state === 'right' ? c.success : state === 'wrong' ? c.error : c.divider, backgroundColor: state === 'right' ? c.successSoft : state === 'wrong' ? c.errorSoft : c.surface }]}>
                <Txt v="bodyMedium">{o}</Txt>
              </Pressable>
            );
          })
        ) : (
          <>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              editable={result === null}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => typed.trim() && submit([ex.answer, ...(ex.alt ?? [])].some((a) => clean(a) === clean(typed)))}
              placeholder="…"
              placeholderTextColor={c.textTertiary}
              style={[styles.input, { color: c.text, borderColor: result === null ? c.divider : result ? c.success : c.error, backgroundColor: c.surface }]}
            />
            {result === null && <Button title={t('phr.check')} disabled={!typed.trim()} onPress={() => submit([ex.answer, ...(ex.alt ?? [])].some((a) => clean(a) === clean(typed)))} />}
          </>
        )}
      </View>

      {result !== null && (
        <Animated.View entering={FadeInDown.springify()} style={[styles.feedback, { backgroundColor: result ? c.successSoft : c.errorSoft }]}>
          <View style={{ flex: 1 }}>
            <Txt v="bodyMedium" color={result ? c.success : c.error}>{result ? t('learn.correct') : t('grammar.answerIs', { a: answer })}</Txt>
            <Animated.View entering={FadeIn}><Txt v="caption" color={c.textSecondary}>{ex.q.replace('___', answer)}</Txt></Animated.View>
          </View>
          <Button title={t('common.continue')} size="m" variant={result ? 'primary' : 'danger'} onPress={onNext} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 52 },
  table: { marginTop: 18, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  tr: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  example: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.l, paddingTop: 12, maxWidth: 680, width: '100%', alignSelf: 'center' },
  option: { padding: 14, borderRadius: radius.m, borderWidth: 1.5 },
  input: { height: 54, borderRadius: radius.m, borderWidth: 1.5, paddingHorizontal: 14, fontFamily: fonts.medium, fontSize: 18 },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.l, marginTop: 'auto' },
  doneIc: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
});
