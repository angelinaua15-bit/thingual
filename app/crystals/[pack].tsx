import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BookmarkPlus, Check } from '../../src/components/icons';
import { Txt } from '../../src/components/ui';
import { EmojiArt, SpeakButton } from '../../src/components/NoteBits';
import { toast } from '../../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { packById } from '../../src/data/wordPacks';
import { haptic } from '../../src/lib/feedback';
import { goBack } from '../../src/lib/nav';

/** An unlocked word collection: listen, read the story, save to My vocabulary. */
export default function Pack() {
  const { c } = useTheme();
  const { t, code } = useT();
  const insets = useSafeAreaInsets();
  const { pack: id } = useLocalSearchParams<{ pack: string }>();
  const pack = packById(id);
  const owned = useApp((s) => s.unlocks.includes(`pack:${id}`));
  const notebook = useApp((s) => s.notebook);

  useEffect(() => {
    // collections open only after they were unlocked with crystals
    if (!pack || !owned) router.replace('/crystals');
  }, [!!pack, owned]);
  if (!pack || !owned) return null;
  const L = (o: { en: string; uk: string }) => (code === 'uk' ? o.uk : o.en);
  const saved = new Set(Object.values(notebook).map((w) => w.word));

  const save = (i: number) => {
    const w = pack.words[i];
    if (saved.has(w.word)) return;
    useApp.getState().addNote({ word: w.word, lang: w.lang, translation: L(w), emoji: w.emoji });
    haptic.success();
    toast(t('nb.added'), 'success');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack('/crystals')} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.m, paddingTop: 0, paddingBottom: insets.bottom + 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <EmojiArt emoji={pack.emoji} size={56} />
        <Txt v="display" style={{ marginTop: 8 }}>{L(pack.title)}</Txt>
        <Txt v="callout" color={c.textSecondary} style={{ marginTop: 4, marginBottom: space.m }}>{L(pack.sub)}</Txt>
        <View style={{ gap: 10 }}>
          {pack.words.map((w, i) => (
            <Animated.View key={w.word} entering={FadeInDown.delay(Math.min(i, 10) * 40)} style={[styles.row, { backgroundColor: c.surface, borderColor: c.divider }]}>
              <View style={[styles.ic, { backgroundColor: c.surfaceAlt }]}><EmojiArt emoji={w.emoji} size={30} /></View>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontFamily: fonts.serif, fontSize: 22, lineHeight: 27, color: c.text }}>{w.word}</Txt>
                <Txt v="callout" color={c.textSecondary} style={{ marginTop: 4 }}>{L(w)}</Txt>
              </View>
              <View style={{ gap: 8, alignItems: 'center' }}>
                <SpeakButton text={w.word} code={w.lang} size={34} />
                <Pressable onPress={() => save(i)} hitSlop={6} style={[styles.save, { backgroundColor: saved.has(w.word) ? c.successSoft : c.surfaceAlt }]} accessibilityLabel={t('cr.save')}>
                  {saved.has(w.word) ? <Check size={16} color={c.success} /> : <BookmarkPlus size={16} color={c.text} />}
                </Pressable>
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 48, justifyContent: 'center', paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  ic: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  save: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
