import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Plus, Search, X } from '../src/components/icons';
import { Txt, Button } from '../src/components/ui';
import { Photo, photoForWord } from '../src/components/Photo';
import { toast } from '../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { CONCEPTS, TOPICS, TOPIC_EMOJI, fullWord, labelOf, type Topic } from '../src/data/concepts';
import { emojiUrl } from '../src/data/emoji';
import { goBack } from '../src/lib/nav';
import { haptic } from '../src/lib/feedback';
import { useIsMax, requireMax, topicOpen } from '../src/lib/premium';
import { MaxBadge, MaxLockCard } from '../src/components/MaxLock';

/** Catalogue of every word in the app, by topic. */
export default function Explore() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ topic?: string }>();
  const s = useApp((x) => x.settings);
  const words = useApp((x) => x.words);
  const [topic, setTopic] = useState<Topic | 'all'>((params.topic as Topic) ?? 'all');
  const [q, setQ] = useState('');
  const max = useIsMax();
  const [topic0] = useState(topic);
  React.useEffect(() => { if (topic0 !== 'all' && !topicOpen(topic0, max)) { setTopic('all'); requireMax('topics'); } }, []);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return CONCEPTS.filter((cc) => topicOpen(cc.topic, max) && (topic === 'all' || cc.topic === topic) && (!query || Object.values(cc.labels).some((l) => l.word?.toLowerCase().includes(query) || l.roman?.toLowerCase().includes(query))));
  }, [topic, q, max]);
  const lockedCount = max ? 0 : CONCEPTS.filter((cc) => !topicOpen(cc.topic, false)).length;
  const missing = list.filter((cc) => !words[cc.id]);

  const contentW = Math.min(width, 760) - space.m * 2;
  const cols = contentW > 600 ? 4 : contentW > 420 ? 3 : 2;
  const tileW = (contentW - (cols - 1) * 10) / cols;

  const addAll = () => {
    if (!requireMax('bulk')) return;
    const st = useApp.getState();
    missing.forEach((cc) => st.saveWord(cc.id, '', 'set'));
    haptic.success();
    toast(t('explore.added', { n: missing.length }), 'success');
  };

  const header = (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
        {(['all', ...TOPICS] as const).map((tp) => {
          const on = topic === tp;
          return (
            <Pressable key={tp} onPress={() => { haptic.light(); if (tp !== 'all' && !topicOpen(tp, max)) { requireMax('topics'); return; } setTopic(tp); }} style={[styles.chip, { backgroundColor: on ? c.ink : c.surface, borderColor: c.divider }]}>
              {tp !== 'all' && <Image source={{ uri: emojiUrl(TOPIC_EMOJI[tp][1]) }} style={{ width: 20, height: 20 }} />}
              <Txt v="captionMedium" color={on ? c.background : c.text}>{tp === 'all' ? t('explore.all') : t(`explore.topics.${tp}`)}</Txt>
              {tp !== 'all' && !topicOpen(tp, max) ? <MaxBadge size={18} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {topic !== 'all' && !q && (
        <Animated.View entering={FadeIn} style={{ marginBottom: 12 }}>
          {missing.length ? (
            <Button title={t('explore.addAll', { n: missing.length }) + (max ? '' : ' · Max')} icon={<Plus size={18} color={c.onAccent} />} onPress={addAll} />
          ) : (
            <View style={[styles.done, { backgroundColor: c.successSoft }]}><Check size={16} color={c.success} /><Txt v="captionMedium">{t('explore.allAdded')}</Txt></View>
          )}
        </Animated.View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack('/(tabs)/dictionary')} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
        <View style={{ flex: 1 }}>
          <Txt v="headline">{t('explore.title')}</Txt>
          <Txt v="caption" color={c.textSecondary}>{t('explore.count', { n: CONCEPTS.length, t: TOPICS.length })}</Txt>
        </View>
      </View>
      <View style={{ paddingHorizontal: space.m, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <View style={[styles.search, { backgroundColor: c.surfaceAlt }]}>
          <Search size={17} color={c.textSecondary} />
          <TextInput value={q} onChangeText={setQ} placeholder={t('explore.search')} placeholderTextColor={c.textTertiary} autoCorrect={false}
            style={{ flex: 1, color: c.text, fontFamily: fonts.regular, fontSize: 15, height: 42 }} />
          {!!q && <Pressable onPress={() => setQ('')} hitSlop={8}><X size={16} color={c.textSecondary} /></Pressable>}
        </View>
      </View>
      <FlatList
        key={cols}
        data={list}
        numColumns={cols}
        keyExtractor={(cc) => cc.id}
        ListHeaderComponent={header}
        ListFooterComponent={lockedCount && !q ? <View style={{ marginTop: 6 }}><MaxLockCard reason="topics" title={t('max.topicsLocked', { n: lockedCount })} sub={t('max.moreLockedSub')} /></View> : undefined}
        ListEmptyComponent={<Txt v="callout" color={c.textSecondary} center style={{ marginTop: 40 }}>{t('explore.empty')}</Txt>}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ padding: space.m, paddingBottom: insets.bottom + 40, gap: 10, maxWidth: 760, width: '100%', alignSelf: 'center' }}
        initialNumToRender={16}
        windowSize={7}
        renderItem={({ item, index }) => {
          const saved = !!words[item.id];
          return (
            <Animated.View entering={index < 16 ? FadeInDown.delay(index * 25) : undefined} style={{ width: tileW }}>
              <Pressable onPress={() => router.push({ pathname: '/word/[id]', params: { id: item.id } })} style={[styles.tile, { backgroundColor: c.surface, borderColor: c.divider }]}>
                <Photo uri={photoForWord(item.id, words[item.id]?.photo, 400)} style={{ width: '100%', aspectRatio: 1 }} />
                <View style={{ padding: 10 }}>
                  <Txt style={{ fontFamily: fonts.serif, fontSize: 20, lineHeight: 24, color: c.text }} numberOfLines={1}>{fullWord(item.id, s.active)}</Txt>
                  <Txt v="caption" color={c.textSecondary} numberOfLines={1}>{labelOf(item.id, s.native)?.word}</Txt>
                </View>
                <Pressable
                  onPress={() => { if (!saved) { useApp.getState().saveWord(item.id, '', 'set'); haptic.success(); } }}
                  hitSlop={8}
                  style={[styles.add, { backgroundColor: saved ? c.success : 'rgba(255,255,255,0.92)' }]}
                >
                  {saved ? <Check size={14} color="#fff" /> : <Plus size={15} color="#141414" />}
                </Pressable>
              </Pressable>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 60 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.m, paddingHorizontal: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  done: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.m, justifyContent: 'center' },
  tile: { borderRadius: radius.l, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  add: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
