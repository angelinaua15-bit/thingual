import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown, SlideInRight, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Lightbulb, Volume2, X } from '../../src/components/icons';
import { Txt, Button, ProgressBar } from '../../src/components/ui';
import { EmojiArt, NoteArt } from '../../src/components/NoteBits';
import { useTheme, fonts, radius, space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { isDue, type Answer } from '../../src/lib/srs';
import { speak, haptic } from '../../src/lib/feedback';
import { goBack } from '../../src/lib/nav';

const SIZE = 15;

/** Flashcards for My vocabulary: meaning → recall the word → check with voice and association. */
export default function NotePractice() {
  const { c, isDark } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { lang } = useLocalSearchParams<{ lang?: string }>();
  const queue = useMemo(() => {
    const all = Object.values(useApp.getState().notebook).filter((w) => !w.done && (!lang || w.lang === lang));
    const due = all.filter((w) => isDue(w.card)).sort((a, b) => a.card.due.localeCompare(b.card.due));
    const pool = due.length ? due : [...all].sort(() => Math.random() - 0.5);
    return pool.slice(0, SIZE).map((w) => w.id);
  }, []);
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(false);
  const [hint, setHint] = useState(false);
  const [done, setDone] = useState(false);
  const correct = useRef(0);
  const started = useRef(Date.now());
  const w = useApp((x) => (queue[idx] ? x.notebook[queue[idx]] : undefined));

  const answer = (a: Answer) => {
    if (!w) return;
    useApp.getState().answerNote(w.id, a);
    if (a !== 'again') correct.current++;
    a === 'again' ? haptic.light() : haptic.success();
    if (idx + 1 >= queue.length) {
      useApp.getState().logSession(queue.length, correct.current, Math.max(1, Math.round((Date.now() - started.current) / 60000)));
      setDone(true);
    } else {
      setIdx(idx + 1);
      setShown(false);
      setHint(false);
    }
  };

  if (!queue.length || done || !w) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: space.l }}>
        <Animated.View entering={ZoomIn.springify()} style={[styles.doneIc, { backgroundColor: done ? c.successSoft : c.surfaceAlt }]}>
          {done ? <Check size={36} color={c.success} /> : <EmojiArt emoji="📝" size={44} />}
        </Animated.View>
        <Txt v="headline" center style={{ marginTop: 16 }}>{done ? t('nb.practiceDone') : t('nb.nothingToPractice')}</Txt>
        {done && <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 6 }}>{t('nb.practiceDoneSub', { n: queue.length })}</Txt>}
        <Button title={done ? t('common.done') : t('nb.add')} onPress={() => (done ? goBack('/notebook') : router.replace('/notebook/edit'))} style={{ marginTop: 24, minWidth: 220 }} />
      </View>
    );
  }

  const warm = isDark ? 'rgba(251,191,36,0.10)' : '#FFF7E0';
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack('/notebook')} hitSlop={12}><X size={22} color={c.text} /></Pressable>
        <View style={{ flex: 1 }}><ProgressBar value={idx / queue.length} /></View>
        <Txt v="captionMedium" color={c.textSecondary}>{idx + 1}/{queue.length}</Txt>
      </View>

      <Animated.View key={w.id} entering={SlideInRight.springify().damping(20)} style={{ flex: 1, padding: space.l, maxWidth: 560, width: '100%', alignSelf: 'center', justifyContent: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.art, { backgroundColor: c.surfaceAlt }]}><NoteArt photo={w.photo} emoji={w.emoji} size={w.photo ? 160 : 104} /></View>
          <Txt v="overline" color={c.textSecondary} style={{ marginTop: 18 }}>{t('nb.remember')}</Txt>
          <Txt center style={{ fontFamily: fonts.serif, fontSize: 36, lineHeight: 42, color: c.text, marginTop: 6 }}>{w.translation || '—'}</Txt>
          {!shown && w.association && (
            hint ? (
              <Animated.View entering={FadeIn} style={[styles.assoc, { backgroundColor: warm }]}>
                <Lightbulb size={15} color="#D97706" />
                <Txt v="callout" style={{ flex: 1 }}>{w.association.replace(new RegExp(w.word.replace(/^(el|la|los|las|le|les|der|die|das|il|lo|gli|o|a|os|as)\s+/i, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '…')}</Txt>
              </Animated.View>
            ) : (
              <Pressable onPress={() => setHint(true)} style={[styles.hintBtn, { borderColor: c.divider }]}>
                <Lightbulb size={15} color={c.textSecondary} />
                <Txt v="captionMedium" color={c.textSecondary}>{t('nb.hint')}</Txt>
              </Pressable>
            )
          )}
        </View>

        {shown && (
          <Animated.View entering={FadeInDown.springify()} style={[styles.answer, { backgroundColor: c.surface, borderColor: c.divider }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontFamily: fonts.serif, fontSize: 40, lineHeight: 46, color: c.text }}>{w.word}</Txt>
                {w.ipa ? <Txt v="callout" color={c.textTertiary}>{w.ipa}</Txt> : null}
              </View>
              <Pressable onPress={() => speak(w.word, w.lang)} style={[styles.round, { backgroundColor: c.surfaceAlt }]}><Volume2 size={20} color={c.text} /></Pressable>
            </View>
            {w.association ? (
              <View style={[styles.assoc, { backgroundColor: warm, marginTop: 12 }]}>
                <Lightbulb size={15} color="#D97706" />
                <Txt v="callout" style={{ flex: 1 }}>{w.association}</Txt>
              </View>
            ) : null}
          </Animated.View>
        )}
      </Animated.View>

      <View style={{ padding: space.m, paddingBottom: insets.bottom + 16, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        {shown ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title={t('nb.again')} variant="secondary" style={{ flex: 1 }} onPress={() => answer('again')} />
            <Button title={t('nb.good')} style={{ flex: 1 }} onPress={() => answer('good')} />
          </View>
        ) : (
          <Button title={t('nb.showAnswer')} onPress={() => { setShown(true); speak(w.word, w.lang); }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 52, paddingHorizontal: 16 },
  art: { borderRadius: 32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  assoc: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.m, marginTop: 16, alignSelf: 'stretch' },
  hintBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1 },
  answer: { marginTop: space.l, padding: 18, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth },
  round: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  doneIc: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
});
