import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, ChevronRight } from '../../src/components/icons';
import { Txt } from '../../src/components/ui';
import { useTheme, radius, space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { ENGLISH_GRAMMAR } from '../../src/data/grammar/english';
import { emojiUrl } from '../../src/data/emoji';
import { goBack } from '../../src/lib/nav';

export default function GrammarList() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const ui = useApp((s) => s.settings.uiLang);
  const done = useApp((s) => s.grammar);
  const levels = ['A1', 'A2', 'B1', 'B2'].filter((l) => ENGLISH_GRAMMAR.some((g) => g.level === l));
  const completed = ENGLISH_GRAMMAR.filter((g) => (done[g.id] ?? 0) >= 60).length;
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={{ height: 48, justifyContent: 'center', paddingHorizontal: 16 }}>
        <Pressable onPress={() => goBack('/(tabs)/learn')} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.m, paddingTop: 0, paddingBottom: insets.bottom + 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <Txt v="display">{t('grammar.title')}</Txt>
        <Txt v="callout" color={c.textSecondary} style={{ marginTop: 4 }}>{t('grammar.sub', { n: ENGLISH_GRAMMAR.length, done: completed })}</Txt>
        {levels.map((lvl) => (
          <View key={lvl} style={{ marginTop: space.l }}>
            <Txt v="overline" color={c.textSecondary} style={{ marginBottom: 8 }}>{lvl}</Txt>
            <View style={{ gap: 8 }}>
              {ENGLISH_GRAMMAR.filter((g) => g.level === lvl).map((g, i) => {
                const score = done[g.id];
                return (
                  <Animated.View key={g.id} entering={FadeInDown.delay(Math.min(i, 8) * 35)}>
                    <Pressable onPress={() => router.push({ pathname: '/grammar/[id]', params: { id: g.id } })} style={[styles.row, { backgroundColor: c.surface, borderColor: c.divider }]}>
                      <View style={[styles.ic, { backgroundColor: c.surfaceAlt }]}><Image source={{ uri: emojiUrl(g.emoji) }} style={{ width: 28, height: 28 }} /></View>
                      <View style={{ flex: 1 }}>
                        <Txt v="bodyMedium">{ui === 'uk' ? g.title.uk : g.title.en}</Txt>
                        <Txt v="caption" color={c.textSecondary} numberOfLines={1}>{ui === 'uk' ? g.title.en : g.examples[0]?.en}</Txt>
                      </View>
                      {score != null ? (
                        <View style={[styles.score, { backgroundColor: score >= 60 ? c.successSoft : c.surfaceAlt }]}>
                          {score >= 60 ? <Check size={13} color={c.success} /> : null}
                          <Txt v="caption" color={score >= 60 ? c.success : c.textSecondary}>{score}%</Txt>
                        </View>
                      ) : <ChevronRight size={18} color={c.textTertiary} />}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  ic: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  score: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 26, borderRadius: 999 },
});
