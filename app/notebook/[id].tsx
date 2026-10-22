import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Lightbulb, Pencil, RotateCcw, Turtle, Volume2 } from '../../src/components/icons';
import { Txt, Button } from '../../src/components/ui';
import { EmojiArt } from '../../src/components/NoteBits';
import { toast } from '../../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../../src/theme/tokens';
import { useT, languageName } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { speak, haptic } from '../../src/lib/feedback';
import { formatInterval, mastery } from '../../src/lib/srs';
import { goBack } from '../../src/lib/nav';

/** One word from My vocabulary: transcription, voice, association, example, learned toggle. */
export default function NoteDetail() {
  const { c, isDark } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = useApp((x) => x.notebook[id]);
  const ui = useApp((x) => x.settings.uiLang);

  useEffect(() => {
    if (!w) router.replace('/notebook');
  }, [!!w]);
  if (!w) return null;

  const toggle = () => {
    if (!w.done) {
      haptic.success();
      toast(t('nb.learnedToast'), 'success');
    }
    useApp.getState().toggleNoteDone(w.id);
  };
  const next = new Date(w.card.due).getTime() - Date.now();
  const m = mastery(w.card);
  const warm = isDark ? 'rgba(251,191,36,0.10)' : '#FFF7E0';

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack('/notebook')} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.push({ pathname: '/notebook/edit', params: { id: w.id } })} hitSlop={10} style={[styles.round, { backgroundColor: c.surfaceAlt }]} accessibilityLabel={t('nb.edit')}>
          <Pencil size={17} color={c.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.m, paddingTop: 0, paddingBottom: insets.bottom + 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.art, { backgroundColor: c.surfaceAlt }]}>
          <EmojiArt emoji={w.emoji} size={72} />
          {w.done && <View style={[styles.doneBadge, { backgroundColor: c.success }]}><Check size={14} color="#fff" strokeWidth={3} /></View>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 }}>
            <Txt v="overline" color={c.textSecondary}>{languageName(w.lang, ui)}</Txt>
            {w.pos ? <View style={[styles.pos, { backgroundColor: c.accentSoft }]}><Txt v="caption" color={c.accent}>{w.pos}</Txt></View> : null}
          </View>
          <Txt style={{ fontFamily: fonts.serif, fontSize: 52, lineHeight: 58, color: c.text, marginTop: 2 }}>{w.word}</Txt>
          {(w.ipa || w.roman) && <Txt v="headline" color={c.textTertiary} style={{ fontFamily: fonts.regular }}>{[w.ipa, w.roman].filter(Boolean).join(' · ')}</Txt>}
          <Txt v="headline" style={{ marginTop: 8, fontSize: 22, lineHeight: 28 }}>{w.translation || '—'}</Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(110).springify()} style={{ flexDirection: 'row', gap: 10, marginTop: space.l }}>
          <Pressable onPress={() => speak(w.word, w.lang)} style={[styles.say, { backgroundColor: c.ink }]}>
            <Volume2 size={18} color={c.background} />
            <Txt v="bodyMedium" color={c.background}>{t('nb.listen')}</Txt>
          </Pressable>
          <Pressable onPress={() => speak(w.word, w.lang, { slow: true })} style={[styles.say, { backgroundColor: c.surfaceAlt }]}>
            <Turtle size={18} color={c.text} />
            <Txt v="bodyMedium">{t('nb.slow')}</Txt>
          </Pressable>
        </Animated.View>

        {w.association ? (
          <Animated.View entering={FadeInDown.delay(160).springify()} style={[styles.card, { backgroundColor: warm, borderColor: isDark ? 'rgba(251,191,36,0.25)' : '#F5E3A8' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Lightbulb size={17} color="#D97706" />
              <Txt v="overline" color="#B45309">{t('nb.association')}</Txt>
            </View>
            <Txt v="body" style={{ marginTop: 8, lineHeight: 23 }}>{w.association}</Txt>
          </Animated.View>
        ) : null}

        {w.example ? (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Txt v="overline" color={c.textSecondary} style={{ flex: 1 }}>{t('nb.example')}</Txt>
              <Pressable onPress={() => speak(w.example!, w.lang)} hitSlop={8}><Volume2 size={17} color={c.textSecondary} /></Pressable>
            </View>
            <Txt style={{ fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: c.text, marginTop: 6 }}>{w.example}</Txt>
            {w.exampleTr ? <Txt v="callout" color={c.textSecondary} style={{ marginTop: 4 }}>{w.exampleTr}</Txt> : null}
          </Animated.View>
        ) : null}

        {w.note ? (
          <Animated.View entering={FadeInDown.delay(230).springify()} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
            <Txt v="overline" color={c.textSecondary}>{t('nb.note')}</Txt>
            <Txt v="body" style={{ marginTop: 6 }}>{w.note}</Txt>
          </Animated.View>
        ) : null}

        {!w.association && !w.example && (
          <Button title={t('nb.aiFill')} variant="secondary" style={{ marginTop: space.l }} onPress={() => router.push({ pathname: '/notebook/edit', params: { id: w.id } })} />
        )}

        <Animated.View entering={FadeInDown.delay(260).springify()} style={{ marginTop: space.l }}>
          <Button
            title={w.done ? t('nb.markUndone') : t('nb.markDone')}
            variant={w.done ? 'secondary' : 'primary'}
            icon={w.done ? <RotateCcw size={18} color={c.text} /> : <Check size={18} color={c.onAccent} />}
            onPress={toggle}
          />
          <Txt v="caption" color={c.textTertiary} center style={{ marginTop: 10 }}>
            {t('nb.added_on', { date: new Date(w.createdAt).toLocaleDateString(ui, { day: 'numeric', month: 'long' }) })}
            {!w.done && m > 0 && next > 0 ? ` · 🔁 ${formatInterval(next, t)}` : ''}
          </Txt>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: 16 },
  round: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  art: { width: 112, height: 112, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  doneBadge: { position: 'absolute', right: -4, top: -4, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pos: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  say: { flex: 1, height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  card: { marginTop: space.m, padding: 16, borderRadius: radius.l, borderWidth: 1 },
});
