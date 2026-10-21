import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Download, FolderPlus, Plus, Search } from 'lucide-react-native';
import { Screen, Txt, Chip, Segmented, EmptyState, PressableScale, PlusBadge, Button } from '../../src/components/ui';
import { Photo, WordTile, MasteryRing, photoForWord } from '../../src/components/Photo';
import { CollectionSheet } from '../../src/components/CollectionSheet';
import { toast } from '../../src/components/Overlay';
import { useTheme, fonts, radius, space, TAB_BAR_HEIGHT } from '../../src/theme/tokens';
import { useT, languageName } from '../../src/i18n';
import { useApp, SavedWord } from '../../src/store/useApp';
import { conceptById, fullWord, labelOf, PLACES } from '../../src/data/concepts';
import { THEMED_SETS } from '../../src/data/social';
import { coverFor, SCENES } from '../../src/data/photos';
import { mastery, formatInterval, isDue } from '../../src/lib/srs';
import { haptic } from '../../src/lib/feedback';

type View_ = 'grid' | 'list' | 'places';
type Filter = 'all' | 'new' | 'hard' | 'learned' | 'drop' | `col:${string}`;

export default function Dictionary() {
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
    await Share.share({ message: ['front,back,note', ...rows].join('\n') });
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
            <Pressable onPress={exportCsv} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Download size={18} color={c.textSecondary} />
            </Pressable>
          </View>
          {s.targets.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
              {s.targets.map((l) => <Chip key={l} label={languageName(l, s.uiLang)} selected={l === target} onPress={() => setActive(l)} />)}
            </ScrollView>
          )}
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

          {/* themed sets */}
          <View style={{ paddingHorizontal: space.m, marginTop: space.xl }}>
            <Txt v="headline" style={{ marginBottom: 12 }}>{t('dictionary.sets')}</Txt>
            <View style={{ gap: 12 }}>
              {THEMED_SETS.map((set, i) => <SetCard key={set.id} set={set} i={i} />)}
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

function SetCard({ set, i }: { set: (typeof THEMED_SETS)[number]; i: number }) {
  const { c } = useTheme();
  const { t } = useT();
  const words = useApp((x) => x.words);
  const saveWord = useApp((x) => x.saveWord);
  const missing = set.concepts.filter((id) => !words[id]);
  return (
    <Animated.View entering={FadeInDown.delay(i * 60)}>
      <PressableScale
        onPress={() => {
          if (!missing.length) return;
          missing.forEach((id) => saveWord(id, '', 'set'));
          haptic.success();
          toast(t('dictionary.added'));
        }}
        style={[styles.set, { backgroundColor: c.surface, borderColor: c.divider }]}
      >
        <View style={{ flexDirection: 'row' }}>
          {set.concepts.slice(0, 3).map((id, k) => (
            <View key={id} style={{ width: 52, height: 52, borderRadius: 14, overflow: 'hidden', marginLeft: k ? -16 : 0, borderWidth: 2, borderColor: c.surface }}>
              <Photo uri={coverFor(id, 200)} style={{ width: '100%', height: '100%' }} />
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="bodyMedium">{t(`dictionary.setNames.${set.id}`)}</Txt>
          <Txt v="caption" color={c.textSecondary}>{set.concepts.length} {t('common.words')}</Txt>
        </View>
        {missing.length ? (
          <View style={[styles.add, { backgroundColor: c.accentSoft }]}>
            <Plus size={14} color={c.accent} />
            <Txt v="captionMedium" color={c.accent}>{missing.length}</Txt>
          </View>
        ) : (
          <Txt v="captionMedium" color={c.success}>{t('dictionary.added')}</Txt>
        )}
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.s, paddingHorizontal: 12, height: 44 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, height: 44 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  set: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 999 },
});
