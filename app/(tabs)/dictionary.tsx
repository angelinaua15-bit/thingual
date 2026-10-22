import { Image } from 'expo-image';
import { emojiUrl } from '../../src/data/emoji';
import { shareFile } from '../../src/lib/share';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Download, FolderPlus, Plus, Search } from '../../src/components/icons';
import { Screen, Txt, Chip, Segmented, EmptyState, PressableScale, PlusBadge, Button } from '../../src/components/ui';
import { Photo, WordTile, MasteryRing, photoForWord } from '../../src/components/Photo';
import { CollectionSheet } from '../../src/components/CollectionSheet';
import { toast } from '../../src/components/Overlay';
import { useTheme, fonts, radius, space, TAB_BAR_HEIGHT } from '../../src/theme/tokens';
import { useT, languageName } from '../../src/i18n';
import { useApp, SavedWord } from '../../src/store/useApp';
import { conceptById, fullWord, labelOf, PLACES, CONCEPTS, TOPICS, TOPIC_EMOJI, conceptsInTopic } from '../../src/data/concepts';
import { coverFor, SCENES } from '../../src/data/photos';
import { mastery, formatInterval, isDue } from '../../src/lib/srs';
import { haptic } from '../../src/lib/feedback';
import { useIsMax, requireMax, topicOpen } from '../../src/lib/premium';
import { NotebookCard } from '../../src/components/NoteBits';
import { MaxBadge, MaxPill } from '../../src/components/MaxLock';

type View_ = 'grid' | 'list' | 'places';
type Filter = 'all' | 'new' | 'hard' | 'learned' | 'drop' | `col:${string}`;

export default function Dictionary() {
  const max = useIsMax();
  const { c } = useTheme();
  const { t } = useT();
  const { width } = useWindowDimensions();
  const s = useApp((x) => x.settings);
  const words = useApp((x) => x.words);
  const collections = useApp((x) => x.collections);
  const setActive = useApp((x) => x.setActiveTarget);
  const [view, setView] = useState<View_>('grid');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [colOpen, setColOpen] = useState(false);
  const target = s.active;

  const all = useMemo(() => Object.values(words).sort((a, b) => b.addedAt - a.addedAt), [words]);
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return all.filter((w) => {
      const cc = conceptById(w.conceptId);
      if (!cc) return false;
      if (query && !Object.values(cc.labels).some((l) => l.word.toLowerCase().includes(query) || l.roman?.toLowerCase().includes(query))) return false;
      const m = mastery(w.card);
      if (filter === 'new') return m === 0;
      if (filter === 'hard') return w.lapses >= 1 || w.card.difficulty > 6;
      if (filter === 'learned') return m === 3;
      if (filter === 'drop') return w.source === 'drop';
      if (filter.startsWith('col:')) return collections.find((col) => col.id === filter.slice(4))?.conceptIds.includes(w.conceptId);
      return true;
    });
  }, [all, q, filter, collections]);

  const contentW = Math.min(width, 720) - space.m * 2;
  const cols = contentW > 560 ? 3 : 2;
  const tileW = (contentW - (cols - 1) * 12) / cols;

  const exportCsv = async () => {
    const rows = all.map((w) => [fullWord(w.conceptId, target), labelOf(w.conceptId, s.native)?.word ?? '', w.note ?? ''].map((v) => `"${v.replace(/"/g, '""')}"`).join(','));
    await shareFile(['front,back,note', ...rows].join('\n'), 'thingual-words.csv', 'text/csv');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 40 }} keyboardShouldPersistTaps="handled" stickyHeaderIndices={[1]}>
        <View style={{ paddingHorizontal: space.m, paddingTop: space.s, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <Txt v="display">{t('dictionary.title')}</Txt>
              <Txt v="callout" color={c.textSecondary}>{t('dictionary.count', { n: all.length })} · {languageName(target, s.uiLang)}</Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 }}>
              <MaxPill />
              <Pressable onPress={exportCsv} hitSlop={8}>
                <Download size={18} color={c.textSecondary} />
              </Pressable>
            </View>
          </View>
          {s.targets.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
              {s.targets.map((l) => <Chip key={l} label={languageName(l, s.uiLang)} selected={l === target} onPress={() => setActive(l)} />)}
            </ScrollView>
          )}
          <NotebookCard style={{ marginTop: 14 }} />
        </View>

        <View style={{ backgroundColor: c.background, paddingTop: 12, paddingBottom: 8 }}>
          <View style={{ paddingHorizontal: space.m, maxWidth: 720, width: '100%', alignSelf: 'center', gap: 10 }}>
            <View style={[styles.search, { backgroundColor: c.surfaceAlt }]}>
              <Search size={18} color={c.textSecondary} />
              <TextInput value={q} onChangeText={setQ} placeholder={t('dictionary.search')} placeholderTextColor={c.textTertiary} style={[styles.input, { color: c.text }]} autoCorrect={false} />
            </View>
            <Segmented
              value={view}
              onChange={setView}
              options={[{ value: 'grid', label: t('dictionary.views.grid') }, { value: 'list', label: t('dictionary.views.list') }, { value: 'places', label: t('dictionary.views.places') }]}
            />
          </View>
        </View>

        <View style={{ maxWidth: 720, width: '100%', alignSelf: 'center' }}>
          {/* collections */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.m, paddingVertical: 8 }}>
            {(['all', 'new', 'hard', 'learned', 'drop'] as Filter[]).map((f) => (
              <Chip key={f} label={t(`dictionary.filters.${f}`)} selected={filter === f} onPress={() => setFilter(f)} tone={f === 'drop' ? 'drop' : undefined} />
            ))}
            {collections.map((col) => (
              <Chip key={col.id} label={`${col.name} · ${col.conceptIds.length}`} selected={filter === `col:${col.id}`} onPress={() => setFilter(`col:${col.id}`)} />
            ))}
            <Chip label={t('dictionary.newCollection')} icon={<FolderPlus size={14} color={c.text} />} onPress={() => setColOpen(true)} />
          </ScrollView>

          {all.length === 0 ? (
            <EmptyState
              art={<View style={{ width: 200, height: 140, borderRadius: radius.l, overflow: 'hidden', marginBottom: 8 }}><Photo uri={SCENES.roomWarsaw} style={{ width: '100%', height: '100%' }} /></View>}
              title={t('dictionary.emptyTitle')}
              sub={t('dictionary.emptySub')}
              cta={t('dictionary.emptyCta')}
              onCta={() => router.navigate('/(tabs)/camera')}
            />
          ) : view === 'grid' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: space.m, paddingTop: 8 }}>
              {list.map((w, i) => (
                <Animated.View key={w.conceptId} entering={FadeInDown.delay(Math.min(i, 12) * 40).duration(400)} layout={LinearTransition.springify()}>
                  <WordTile conceptId={w.conceptId} lang={target} photo={w.photo} size={tileW} level={mastery(w.card)} onPress={() => router.push({ pathname: '/word/[id]', params: { id: w.conceptId } })} sub={labelOf(w.conceptId, s.native)?.word} />
                </Animated.View>
              ))}
            </View>
          ) : view === 'list' ? (
            <View style={{ paddingHorizontal: space.m, paddingTop: 8 }}>
              {list.map((w, i) => <WordRow key={w.conceptId} w={w} i={i} />)}
            </View>
          ) : (
            <View style={{ paddingTop: 8 }}>
              {PLACES.map((p) => {
                const items = list.filter((w) => w.place === p);
                if (!items.length) return null;
                return (
                  <View key={p} style={{ marginBottom: space.l }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: space.m, marginBottom: 10 }}>
                      <Txt v="headline">{t(`places.${p}`)}</Txt>
                      <Txt v="caption" color={c.textSecondary}>{items.length}</Txt>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: space.m }}>
                      {items.map((w) => (
                        <WordTile key={w.conceptId} conceptId={w.conceptId} lang={target} photo={w.photo} size={130} level={mastery(w.card)} onPress={() => router.push({ pathname: '/word/[id]', params: { id: w.conceptId } })} />
                      ))}
                    </ScrollView>
                  </View>
                );
              })}
            </View>
          )}

          {/* word catalogue by topic */}
          <View style={{ paddingHorizontal: space.m, marginTop: space.xl }}>
            <PressableScale onPress={() => router.push('/explore')} style={[styles.catalog, { backgroundColor: c.ink }]}>
              <View style={{ flex: 1 }}>
                <Txt v="headline" color={c.background}>{t('explore.open')}</Txt>
                <Txt v="caption" color={c.background} style={{ opacity: 0.75, marginTop: 2 }}>{t('explore.openSub', { n: CONCEPTS.length, t: TOPICS.length })}</Txt>
              </View>
              <View style={{ flexDirection: 'row' }}>
                {(['animals', 'food', 'travel'] as const).map((tp, k) => (
                  <Image key={tp} source={{ uri: emojiUrl(TOPIC_EMOJI[tp][1]) }} style={{ width: 40, height: 40, marginLeft: k ? -10 : 0 }} />
                ))}
              </View>
            </PressableScale>
            <View style={styles.topicGrid}>
              {TOPICS.map((tp, i) => (
                <Animated.View key={tp} entering={FadeInDown.delay(Math.min(i, 10) * 30)} style={{ width: '31.5%', flexGrow: 1 }}>
                  <PressableScale onPress={() => (topicOpen(tp, max) ? router.push({ pathname: '/explore', params: { topic: tp } }) : requireMax('topics'))} style={[styles.topic, { backgroundColor: c.surface, borderColor: c.divider }]}>
                    {!topicOpen(tp, max) ? <View style={{ position: 'absolute', top: 6, right: 6 }}><MaxBadge size={18} /></View> : null}
                    <Image source={{ uri: emojiUrl(TOPIC_EMOJI[tp][1]) }} style={{ width: 36, height: 36 }} />
                    <Txt v="captionMedium" numberOfLines={1}>{t(`explore.topics.${tp}`)}</Txt>
                    <Txt v="caption" color={c.textTertiary}>{conceptsInTopic(tp).length}</Txt>
                  </PressableScale>
                </Animated.View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      <CollectionSheet visible={colOpen} onClose={() => setColOpen(false)} />
    </Screen>
  );
}

function WordRow({ w, i }: { w: SavedWord; i: number }) {
  const { c } = useTheme();
  const { t } = useT();
  const s = useApp((x) => x.settings);
  const due = isDue(w.card);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(i, 12) * 30)}>
      <Pressable onPress={() => router.push({ pathname: '/word/[id]', params: { id: w.conceptId } })} style={({ pressed }) => [styles.row, { borderColor: c.divider, opacity: pressed ? 0.7 : 1 }]}>
        <MasteryRing level={mastery(w.card)} size={56}>
          <Photo uri={photoForWord(w.conceptId, w.photo, 200)} style={{ width: '100%', height: '100%' }} />
        </MasteryRing>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontFamily: fonts.serif, fontSize: 24, lineHeight: 28, color: c.text }}>{fullWord(w.conceptId, s.active)}</Txt>
          <Txt v="caption" color={c.textSecondary}>{labelOf(w.conceptId, s.native)?.word}{w.note ? ` · ${w.note}` : ''}</Txt>
        </View>
        <Txt v="caption" color={due ? c.accent : c.textTertiary}>
          {due ? t('common.today') : formatInterval(new Date(w.card.due).getTime() - Date.now(), t)}
        </Txt>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  catalog: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: radius.l },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  topic: { alignItems: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 6, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.s, paddingHorizontal: 12, height: 44 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, height: 44 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  set: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 999 },
});
