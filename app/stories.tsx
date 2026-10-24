import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Check } from '../src/components/icons';
import { Txt } from '../src/components/ui';
import { EmojiArt } from '../src/components/NoteBits';
import { Mascot } from '../src/components/PathBits';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT, languageName } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { STORIES } from '../src/data/stories';
import { CEFR_LEVELS } from '../src/data/concepts';
import { goBack } from '../src/lib/nav';

const TINTS = ['#8B5CF6', '#3B82F6', '#2FB574', '#F59E0B', '#EC4899', '#14B8A6'];

/** Tingo Stories: little scenes from his travels, in the language you learn. */
export default function Stories() {
  const { c, isDark } = useTheme();
  const { t, code } = useT();
  const insets = useSafeAreaInsets();
  const s = useApp((x) => x.settings);
  const done = useApp((x) => x.stories);
  const L = (o: { en: string; uk: string }) => (code === 'uk' ? o.uk : o.en);
  const finished = STORIES.filter((st) => done[`${s.active}:${st.id}`]).length;

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack('/(tabs)/path')} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.m, paddingTop: 0, paddingBottom: insets.bottom + 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={[styles.hero, { backgroundColor: isDark ? 'rgba(139,92,246,.16)' : '#F1EBFF' }]}>
          <View style={{ flex: 1 }}>
            <Txt v="display">{t('stories.title')}</Txt>
            <Txt v="callout" color={c.textSecondary} style={{ marginTop: 6 }}>{t('stories.sub', { lang: languageName(s.active, s.uiLang) })}</Txt>
            <Txt v="captionMedium" color="#8B5CF6" style={{ marginTop: 10 }}>{t('stories.progress', { n: finished, total: STORIES.length })}</Txt>
          </View>
          <Mascot size={86} />
        </View>
        {CEFR_LEVELS.filter((lv) => STORIES.some((st) => st.level === lv)).map((lv) => (
          <View key={lv}>
            <Txt v="overline" color={c.textSecondary} style={{ marginTop: space.l, marginBottom: 10 }}>{lv} · {t(`cefr.${lv}`)}</Txt>
            <View style={styles.grid}>
              {STORIES.filter((st) => st.level === lv).map((st, i) => {
                const fin = !!done[`${s.active}:${st.id}`];
                const tint = TINTS[(STORIES.indexOf(st)) % TINTS.length];
                return (
                  <Animated.View key={st.id} entering={FadeInDown.delay(Math.min(i, 8) * 40)} style={{ width: '47%', flexGrow: 1 }}>
                    <Pressable onPress={() => router.push({ pathname: '/story', params: { id: st.id } })} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
                      <View style={[styles.art, { backgroundColor: `${tint}22` }]}>
                        <EmojiArt emoji={st.scene} size={54} />
                        <View style={styles.npc}><EmojiArt emoji={st.npc.emoji} size={28} /></View>
                        {fin && <View style={[styles.done, { backgroundColor: '#2FB574' }]}><Check size={14} color="#fff" strokeWidth={3} /></View>}
                      </View>
                      <Txt style={{ fontFamily: fonts.serif, fontSize: 19, lineHeight: 23, color: c.text, marginTop: 10 }} numberOfLines={2}>{L(st.title)}</Txt>
                      <Txt v="caption" color={c.textSecondary}>{t('stories.with', { name: L(st.npc.name) })}</Txt>
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
  bar: { height: 48, justifyContent: 'center', paddingHorizontal: 16 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: radius.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { padding: 12, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, minHeight: 190 },
  art: { height: 96, borderRadius: radius.m, alignItems: 'center', justifyContent: 'center' },
  npc: { position: 'absolute', right: 8, bottom: 6 },
  done: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
