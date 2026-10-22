import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Search, X } from '../../src/components/icons';
import { Txt, Button, Chip, Segmented, PressableScale, ProgressBar } from '../../src/components/ui';
import { EmojiArt, NoteArt, DoneCheck, SpeakButton } from '../../src/components/NoteBits';
import { toast } from '../../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../../src/theme/tokens';
import { useT, languageName } from '../../src/i18n';
import { useApp, type NoteWord } from '../../src/store/useApp';
import { isDue } from '../../src/lib/srs';
import { goBack } from '../../src/lib/nav';
import type { LangCode } from '../../src/data/languages';

type Filter = 'all' | 'learning' | 'learned';

/** My vocabulary: words the learner writes down themselves, with AI associations. */
export default function Notebook() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const s = useApp((x) => x.settings);
  const notebook = useApp((x) => x.notebook);
  const toggle = useApp((x) => x.toggleNoteDone);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const all = useMemo(() => Object.values(notebook).sort((a, b) => b.createdAt - a.createdAt), [notebook]);
  const langs = useMemo(() => [...new Set(all.map((w) => w.lang))], [all]);
  const [langPick, setLang] = useState<LangCode | 'all'>('all');
  const lang = langs.length > 1 ? langPick : 'all';

  const inLang = all.filter((w) => lang === 'all' || w.lang === lang);
  const learned = inLang.filter((w) => w.done).length;
  const due = inLang.filter((w) => !w.done && isDue(w.card)).length;
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return inLang.filter((w) => (filter === 'all' || (filter === 'learned' ? w.done : !w.done)) && (!query || [w.word, w.translation, w.note ?? ''].join(' ').toLowerCase().includes(query)));
  }, [inLang, filter, q]);

  const onToggle = (w: NoteWord) => {
    if (!w.done) toast(t('nb.learnedToast'), 'success');
    toggle(w.id);
  };

  const header = (
    <View>
      <Txt v="display">{t('nb.title')}</Txt>
      <Txt v="callout" color={c.textSecondary} style={{ marginTop: 4 }}>{t('nb.openSub')}</Txt>

      {all.length > 0 && (
        <Animated.View entering={FadeInDown.delay(40)} style={[styles.hero, { backgroundColor: c.ink }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontFamily: fonts.serif, fontSize: 40, lineHeight: 44, color: c.background }}>{t('nb.count', { n: inLang.length })}</Txt>
              <Txt v="caption" color={c.background} style={{ opacity: 0.7 }}>{t('nb.learnedN', { n: learned })}</Txt>
            </View>
            <Button
              title={due ? t('nb.practiceDue', { n: due }) : t('nb.practice')}
              variant="inverse"
              size="m"
              onPress={() => (inLang.some((w) => !w.done) ? router.push({ pathname: '/notebook/practice', params: lang === 'all' ? {} : { lang } }) : toast(t('nb.nothingToPractice')))}
            />
          </View>
          <View style={{ marginTop: 14 }}>
            <ProgressBar value={inLang.length ? learned / inLang.length : 0} color={c.success} height={6} track="rgba(127,127,127,.25)" />
          </View>
        </Animated.View>
      )}

      {all.length > 0 && (
        <>
          <View style={[styles.search, { backgroundColor: c.surfaceAlt }]}>
            <Search size={18} color={c.textTertiary} />
            <TextInput value={q} onChangeText={setQ} placeholder={t('nb.search')} placeholderTextColor={c.textTertiary} style={[styles.searchInput, { color: c.text }]} />
            {q ? <Pressable onPress={() => setQ('')} hitSlop={8}><X size={16} color={c.textTertiary} /></Pressable> : null}
          </View>
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: t('nb.all') }, { value: 'learning', label: t('nb.learning') }, { value: 'learned', label: t('nb.learned') }]}
            style={{ marginTop: 12 }}
          />
          {langs.length > 1 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <Chip label={t('nb.all')} selected={lang === 'all'} onPress={() => setLang('all')} />
              {langs.map((l) => <Chip key={l} label={languageName(l, s.uiLang)} selected={lang === l} onPress={() => setLang(l)} />)}
            </View>
          )}
        </>
      )}
      <View style={{ height: 14 }} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack('/(tabs)/dictionary')} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
      </View>
      <FlatList
        data={list}
        keyExtractor={(w) => w.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          all.length ? (
            <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 30 }}>—</Txt>
          ) : (
            <Animated.View entering={FadeInDown.delay(80)} style={[styles.empty, { backgroundColor: c.surface, borderColor: c.divider }]}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {['🕊️', '💭', '❤️'].map((e, i) => (
                  <View key={e} style={[styles.emptyTile, { backgroundColor: c.surfaceAlt, transform: [{ rotate: `${(i - 1) * 8}deg` }, { translateY: i === 1 ? -8 : 0 }] }]}>
                    <EmojiArt emoji={e} size={40} />
                  </View>
                ))}
              </View>
              <Txt v="headline" center style={{ marginTop: 18 }}>{t('nb.empty')}</Txt>
              <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 6, maxWidth: 320 }}>{t('nb.emptySub')}</Txt>
              <Button title={t('nb.emptyCta')} icon={<Plus size={18} color={c.onAccent} />} onPress={() => router.push('/notebook/edit')} style={{ marginTop: 18, alignSelf: 'stretch' }} />
            </Animated.View>
          )
        }
        contentContainerStyle={{ padding: space.m, paddingTop: 0, paddingBottom: insets.bottom + 110, maxWidth: 720, width: '100%', alignSelf: 'center' }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item: w, index }) => (
          <Animated.View entering={index < 12 ? FadeInDown.delay(index * 30) : undefined} layout={LinearTransition.springify().damping(18)}>
            <PressableScale onPress={() => router.push({ pathname: '/notebook/[id]', params: { id: w.id } })} style={[styles.row, { backgroundColor: c.surface, borderColor: c.divider, opacity: w.done ? 0.72 : 1 }]}>
              <View style={[styles.ic, { backgroundColor: c.surfaceAlt }]}><NoteArt photo={w.photo} emoji={w.emoji} size={52} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 8 }}>
                  <Txt style={{ fontFamily: fonts.serif, fontSize: 24, lineHeight: 28, color: c.text, textDecorationLine: w.done ? 'line-through' : 'none' }} numberOfLines={1}>{w.word}</Txt>
                  {w.ipa ? <Txt v="caption" color={c.textTertiary} numberOfLines={1}>{w.ipa}</Txt> : null}
                </View>
                <Txt v="callout" color={c.textSecondary} numberOfLines={1}>{w.translation || '—'}</Txt>
              </View>
              <SpeakButton text={w.word} code={w.lang} size={34} />
              <DoneCheck done={w.done} onPress={() => onToggle(w)} />
            </PressableScale>
          </Animated.View>
        )}
      />
      {all.length > 0 && (
        <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.fabWrap, { bottom: insets.bottom + 20 }]}>
          <PressableScale onPress={() => router.push('/notebook/edit')} style={[styles.fab, { backgroundColor: c.accent }]}>
            <Plus size={20} color={c.onAccent} />
            <Txt v="bodyMedium" color={c.onAccent}>{t('nb.add')}</Txt>
          </PressableScale>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 48, justifyContent: 'center', paddingHorizontal: 16 },
  hero: { borderRadius: radius.xl, padding: 20, marginTop: space.m },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: radius.m, paddingHorizontal: 14, marginTop: space.m },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, height: 44 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  ic: { width: 52, height: 52, borderRadius: 15, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', padding: space.l, paddingTop: space.xl, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, marginTop: space.m },
  emptyTile: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  fabWrap: { position: 'absolute', alignSelf: 'center' },
  fab: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 54, paddingHorizontal: 22, borderRadius: 27, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
});
