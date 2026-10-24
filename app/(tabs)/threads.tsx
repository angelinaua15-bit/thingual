import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PenSquare, UserPlus } from '../../src/components/icons';
import { Txt, Chip, EmptyState, PressableScale } from '../../src/components/ui';
import { PostCard } from '../../src/components/PostCard';
import { EmojiArt } from '../../src/components/NoteBits';
import { useTheme, radius, space, TAB_BAR_HEIGHT } from '../../src/theme/tokens';
import { useT, languageName } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { POST_TOPICS, feed, type PostTopic } from '../../src/lib/api';
import { useLikedSet, useNet, connect } from '../../src/lib/queries';
import { promptOfDay } from '../../src/data/prompts';
import type { LangCode } from '../../src/data/languages';

/** Threads: people write in the languages they learn, answer each other and fix each other's mistakes. */
export default function Threads() {
  const { c } = useTheme();
  const { t, code } = useT();
  const insets = useSafeAreaInsets();
  const s = useApp((x) => x.settings);
  const status = useNet((x) => x.status);
  const [tab, setTab] = useState<'for_you' | 'following'>('for_you');
  const [lang, setLang] = useState<LangCode | null>(s.active);
  const [topic, setTopic] = useState<PostTopic | null>(null);
  const langs = useMemo(() => [...new Set<LangCode>([s.active, ...s.targets, s.native])], [s.active, s.targets, s.native]);
  const today = promptOfDay();

  const q = useInfiniteQuery({
    queryKey: ['feed', tab, topic, lang],
    queryFn: ({ pageParam }) => feed(tab, pageParam || undefined, topic ?? undefined, lang ?? undefined),
    initialPageParam: '',
    getNextPageParam: (last) => (last.length >= 20 ? last[last.length - 1].created_at : undefined),
    enabled: status === 'ok',
  });
  const posts = useMemo(() => q.data?.pages.flat() ?? [], [q.data]);
  const liked = useLikedSet(posts);

  const header = (
    <View style={{ marginBottom: 4 }}>
      <View style={styles.titleRow}>
        <Txt v="display">{t('threads.title')}</Txt>
        <Pressable onPress={() => router.push('/people')} style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]} accessibilityLabel={t('social.findPeople')}>
          <UserPlus size={18} color={c.text} />
        </Pressable>
      </View>
      <Txt v="callout" color={c.textSecondary}>{t('threads.sub')}</Txt>

      {/* topic of the day: everyone writes about the same thing */}
      <PressableScale onPress={() => router.push({ pathname: '/compose', params: { prompt: '1', topic: 'practice' } })} style={[styles.today, { backgroundColor: c.ink }]}>
        <View style={{ flex: 1 }}>
          <Txt v="overline" color={c.background} style={{ opacity: 0.7 }}>{t('threads.today')} · {today.min}+</Txt>
          <Txt v="headline" color={c.background} style={{ marginTop: 4 }}>{code === 'uk' ? today.uk : today.en}</Txt>
          <Txt v="captionMedium" color={c.background} style={{ marginTop: 10, opacity: 0.85 }}>{t('threads.todayCta', { lang: languageName(s.active, s.uiLang) })} →</Txt>
        </View>
        <EmojiArt emoji="✍️" size={52} />
      </PressableScale>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 14 }}>
        {langs.map((l) => <Chip key={l} label={languageName(l, s.uiLang)} selected={lang === l} onPress={() => setLang(l)} />)}
        <Chip label={t('threads.allLangs')} selected={!lang} onPress={() => setLang(null)} />
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
        <Chip label={t('social.forYou')} selected={tab === 'for_you' && !topic} onPress={() => { setTab('for_you'); setTopic(null); }} />
        <Chip label={t('social.followingFeed')} selected={tab === 'following'} onPress={() => setTab('following')} />
        {POST_TOPICS.map((x) => <Chip key={x.id} label={`${x.emoji} ${t(`threads.topics.${x.id}`)}`} selected={topic === x.id} onPress={() => setTopic(topic === x.id ? null : x.id)} />)}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item, index }) => <PostCard post={item} i={index % 20} liked={liked.has(item.id)} />}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: TAB_BAR_HEIGHT + 90, paddingHorizontal: 16, maxWidth: 680, width: '100%', alignSelf: 'center' }}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={q.isRefetching}
        onRefresh={() => q.refetch()}
        ListHeaderComponent={header}
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator style={{ margin: 20 }} color={c.textSecondary} /> : undefined}
        ListEmptyComponent={
          q.isLoading || status === 'idle' ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={c.textSecondary} />
          ) : status === 'offline' || q.isError ? (
            <EmptyState title={t('social.offline')} cta={t('social.retry')} onCta={() => { connect(); q.refetch(); }} />
          ) : tab === 'following' ? (
            <EmptyState title={t('social.emptyFeed')} sub={t('social.emptyFollowing')} cta={t('social.findPeople')} onCta={() => router.push('/people')} />
          ) : (
            <EmptyState title={t('threads.empty', { lang: lang ? languageName(lang, s.uiLang) : '' })} sub={t('threads.emptySub')} cta={t('threads.new')} onCta={() => router.push('/compose')} />
          )
        }
      />
      <PressableScale onPress={() => router.push('/compose')} style={[styles.fab, { backgroundColor: c.ink, bottom: TAB_BAR_HEIGHT + 18 }]} accessibilityLabel={t('threads.new')}>
        <PenSquare size={22} color={c.background} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  today: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: radius.xl, marginTop: space.m },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
});
