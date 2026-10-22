import { InstallBanner } from '../../src/components/InstallBanner';
import { Image } from 'expo-image';
import { emojiUrl } from '../../src/data/emoji';
import { EXPRESSIONS } from '../../src/data/expressions';
import { ENGLISH_GRAMMAR as ALL_GRAMMAR } from '../../src/data/grammar/english';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowRight, Image as ImageIcon, Keyboard, Mic, Puzzle, Search, Type as TypeIcon, Layers } from '../../src/components/icons';
import { Screen, Txt, Button, PressableScale } from '../../src/components/ui';
import { Photo, photoForWord } from '../../src/components/Photo';
import { useTheme, fonts, radius, space, TAB_BAR_HEIGHT } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { isDue } from '../../src/lib/srs';
import { lang } from '../../src/data/languages';
import { StreakPills } from '../../src/components/StreakBits';
import { TimeCard } from '../../src/components/TimeCard';
import { AudiobooksBanner } from '../../src/components/BookBits';

const EX = [
  { id: 'recall', icon: Layers }, { id: 'choose', icon: ImageIcon }, { id: 'type', icon: Keyboard },
  { id: 'speak', icon: Mic }, { id: 'sentence', icon: Puzzle }, { id: 'article', icon: TypeIcon }, { id: 'find', icon: Search },
] as const;

export default function Learn() {
  const { c } = useTheme();
  const { t } = useT();
  const s = useApp((x) => x.settings);
  const words = useApp((x) => x.words);
  const update = useApp((x) => x.updateSettings);
  const exprs = useApp((x) => x.exprs);
  const notebook = useApp((x) => x.notebook);
  const grammar = useApp((x) => x.grammar);
  const exprDue = Object.values(exprs).filter((e) => isDue(e.card)).length;
  const notes = Object.values(notebook);
  const noteDue = notes.filter((w) => !w.done && isDue(w.card)).length;
  const grammarDone = ALL_GRAMMAR.filter((g) => (grammar[g.id] ?? 0) >= 60).length;

  const list = Object.values(words);
  const due = list.filter((w) => isDue(w.card));
  const exercises = EX.filter((e) => e.id !== 'article' || lang(s.active).articles);

  const tiles = [
    { href: '/notebook', emoji: '📝', title: t('nb.title'), sub: notes.length ? `${t('nb.count', { n: notes.length })}${noteDue ? ` · ${t('nb.practiceDue', { n: noteDue })}` : ''}` : t('learn.tiles.notebook') },
    { href: '/phrases', emoji: '💬', title: t('phr.title'), sub: exprDue ? t('phr.reviewDue', { n: exprDue }) : t('phr.total', { n: EXPRESSIONS.length }) },
    { href: '/grammar', emoji: '✏️', title: t('grammar.title'), sub: t('learn.tiles.grammar', { n: ALL_GRAMMAR.length, done: grammarDone }) },
    { href: '/tutor', emoji: '🤖', title: t('tutor.title'), sub: t('tutor.short') },
  ] as const;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.m, paddingBottom: TAB_BAR_HEIGHT + 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 8, rowGap: 6, marginTop: space.s }}>
          <Txt v="display">{t('learn.title')}</Txt>
          <StreakPills />
        </View>

        {/* audiobooks — photo banner at the top */}
        <Animated.View entering={FadeInDown.delay(30)} style={{ marginTop: space.m }}>
          <AudiobooksBanner />
        </Animated.View>

        {/* today */}
        <Animated.View entering={FadeInDown.delay(90)} style={[styles.today, { backgroundColor: c.ink }]}>
          {list.length === 0 ? (
            <>
              <Txt v="headline" color={c.background}>{t('learn.emptyTitle')}</Txt>
              <Txt v="callout" color={c.background} style={{ opacity: 0.7, marginTop: 6, marginBottom: 16 }}>{t('learn.emptySub')}</Txt>
              <Button title={t('dictionary.emptyCta')} variant="inverse" onPress={() => router.navigate('/(tabs)/camera')} />
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Txt v="overline" color={c.background} style={{ opacity: 0.6 }}>{t('common.today')}</Txt>
                  <Txt style={{ fontFamily: fonts.serif, fontSize: 34, lineHeight: 38, color: c.background, marginTop: 4 }}>
                    {due.length ? t('learn.due', { n: due.length }) : t('learn.nothingDue')}
                  </Txt>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  {(due.length ? due : list).slice(0, 3).map((w, i) => (
                    <View key={w.conceptId} style={{ width: 54, height: 68, borderRadius: 12, overflow: 'hidden', marginLeft: i ? -22 : 0, borderWidth: 2, borderColor: c.text, transform: [{ rotate: `${(i - 1) * 6}deg` }] }}>
                      <Photo uri={photoForWord(w.conceptId, w.photo, 200)} style={{ width: '100%', height: '100%' }} />
                    </View>
                  ))}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 16 }}>
                {([3, 5, 10, 15] as const).map((m) => (
                  <Pressable key={m} onPress={() => update({ dailyMinutes: m })} style={[styles.len, { backgroundColor: s.dailyMinutes === m ? c.background : 'transparent', borderColor: c.background }]}>
                    <Txt v="captionMedium" color={s.dailyMinutes === m ? c.text : c.background}>{t('learn.minutes', { n: m })}</Txt>
                  </Pressable>
                ))}
              </View>
              <Button title={t('learn.start')} variant="inverse" icon={<ArrowRight size={18} color="#141414" />} onPress={() => router.push('/review')} />
            </>
          )}
        </Animated.View>

        {/* time today → crystals */}
        <TimeCard />

        {/* study: 2 × 2 */}
        <View style={styles.grid}>
          {tiles.map((x, i) => (
            <Animated.View key={x.href} entering={FadeInDown.delay(150 + i * 40)} style={{ width: '48.5%', flexGrow: 1 }}>
              <PressableScale onPress={() => router.push(x.href)} style={[styles.tile, { backgroundColor: c.surface, borderColor: c.divider }]}>
                <Image source={{ uri: emojiUrl(x.emoji) }} style={{ width: 36, height: 36 }} />
                <Txt v="bodyMedium" numberOfLines={2} style={{ marginTop: 10 }}>{x.title}</Txt>
                <Txt v="caption" color={c.textSecondary} numberOfLines={2}>{x.sub}</Txt>
              </PressableScale>
            </Animated.View>
          ))}
        </View>

        {/* practice modes */}
        <Txt v="headline" style={{ marginTop: space.l, marginBottom: 10 }}>{t('learn.exercises')}</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: space.m }} style={{ marginHorizontal: -space.m, paddingLeft: space.m }}>
          {exercises.map((e) => {
            const Icon = e.icon;
            const hot = e.id === 'find';
            return (
              <PressableScale
                key={e.id}
                onPress={() => (e.id === 'find' ? router.push('/find') : router.push({ pathname: '/review', params: { mode: e.id } }))}
                style={[styles.ex, { backgroundColor: hot ? c.dropSoft : c.surface, borderColor: c.divider }]}
              >
                <Icon size={18} color={hot ? c.drop : c.text} />
                <Txt v="captionMedium">{t(`learn.ex.${e.id}`)}</Txt>
              </PressableScale>
            );
          })}
        </ScrollView>

        {/* weekly league */}
        <PressableScale onPress={() => router.push('/league')} style={[styles.row, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <Image source={{ uri: emojiUrl('🏆') }} style={{ width: 32, height: 32 }} />
          <View style={{ flex: 1 }}>
            <Txt v="bodyMedium">{t('league.title')}</Txt>
            <Txt v="caption" color={c.textSecondary}>{t('league.short')}</Txt>
          </View>
          <ArrowRight size={18} color={c.textTertiary} />
        </PressableScale>

        <InstallBanner />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  today: { marginTop: 12, padding: 20, borderRadius: radius.xl },
  len: { paddingHorizontal: 12, height: 32, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: space.l },
  tile: { padding: 14, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, minHeight: 124 },
  ex: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: space.l, padding: 14, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
});
