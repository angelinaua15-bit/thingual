import { haptic } from '../../src/lib/feedback';
import type { MapKind } from '../../src/components/mapHtml';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Animated, { FadeIn, FadeInDown, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Languages, Lock, LocateFixed, PenSquare, Search, UserPlus, X } from '../../src/components/icons';
import { Txt, Chip, Segmented, Button, Avatar, PressableScale, EmptyState } from '../../src/components/ui';
import { Photo } from '../../src/components/Photo';
import { WorldMap } from '../../src/components/WorldMap';
import { PostCard } from '../../src/components/PostCard';
import { useTheme, fonts, radius, space, TAB_BAR_HEIGHT } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { dropFor, dateKey } from '../../src/data/social';
import { CONCEPTS, fullWord, labelOf } from '../../src/data/concepts';
import { coverFor } from '../../src/data/photos';
import { LangCode } from '../../src/data/languages';
import { feed, followingIds, mapPosts, myDropToday, type PostRow } from '../../src/lib/api';
import { useLikedSet, useNet, connect } from '../../src/lib/queries';
import { getMyCity } from '../../src/lib/publish';

type Layer = 'drop' | 'all' | 'word' | 'following';

export default function MapTab() {
  const { c, isDark } = useTheme();
  const glass = isDark ? 'rgba(26,26,26,0.94)' : 'rgba(242,241,237,0.94)';
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ concept?: string }>();
  const s = useApp((x) => x.settings);
  const localDrop = useApp((x) => x.drops[dateKey()]);
  const status = useNet((x) => x.status);
  const uid = useNet((x) => x.uid);
  const [mode, setMode] = useState<'map' | 'feed'>('feed');
  const [layer, setLayer] = useState<Layer>('all');
  const [concept, setConcept] = useState<string>(dropFor());
  const [q, setQ] = useState('');
  const [words, setWords] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<PostRow | null>(null);
  const today = dropFor();

  useEffect(() => {
    if (params.concept) {
      setMode('map');
      setLayer('word');
      setConcept(params.concept);
    }
  }, [params.concept]);

  const myDrop = useQuery({ queryKey: ['myDrop', dateKey()], queryFn: () => myDropToday(dateKey()), enabled: status === 'ok' });
  const dropPosted = !!localDrop || !!myDrop.data;
  const following = useQuery({ queryKey: ['followingIds', uid], queryFn: () => followingIds(), enabled: status === 'ok' });

  const posts = useQuery({
    queryKey: ['map', layer, layer === 'word' ? concept : '', layer === 'following' ? following.data?.join(',') : ''],
    queryFn: () =>
      layer === 'drop' ? mapPosts({ dropDay: dateKey(), concept: today })
        : layer === 'word' ? mapPosts({ concept })
          : layer === 'following' ? mapPosts({ authors: [...(following.data ?? []), ...(uid ? [uid] : [])] })
            : mapPosts({}),
    enabled: mode === 'map' && status === 'ok' && (layer !== 'following' || !!following.data),
  });

  const locked = layer === 'drop' && !dropPosted;
  const friendSet = useMemo(() => new Set(following.data ?? []), [following.data]);
  const mapStyle = s.mapStyle ?? 'color';
  const [me, setMe] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const points = useMemo(
    () => (locked ? [] : (posts.data ?? []).map((p) => ({
      id: p.id, lat: p.lat!, lng: p.lng!, photo: p.photo_url!, highlight: p.author_id === uid,
      kind: (p.author_id === uid ? 'mine' : p.is_drop ? 'drop' : layer === 'following' || friendSet.has(p.author_id) ? 'friend' : p.concept_id ? 'word' : 'post') as MapKind,
      label: p.concept_id ? labelOf(p.concept_id, (p.lang ?? 'en') as LangCode)?.word ?? p.author.handle : p.author.handle,
      sub: p.concept_id ? p.lang ?? '' : '',
    }))),
    [posts.data, locked, uid, layer, friendSet],
  );
  const byId = useMemo(() => new Map((posts.data ?? []).map((p) => [p.id, p])), [posts.data]);
  const centerTuple = useMemo<[number, number] | undefined>(() => (center ? [center.lat, center.lng] : undefined), [center]);

  const suggestions = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return CONCEPTS.filter((cc) => Object.values(cc.labels).some((l) => l.word?.toLowerCase().startsWith(query))).slice(0, 6);
  }, [q]);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {mode === 'map' ? (
        <View style={{ flex: 1 }}>
          <WorldMap
            points={points}
            wordsMode={words}
            center={centerTuple}
            zoom={center ? 10 : undefined}
            mapStyle={mapStyle}
            me={me}
            onSelect={(id) => setSelected(byId.get(id) ?? null)}
            onBlank={() => setSelected(null)}
          />
          {locked && (
            <Animated.View entering={FadeIn} style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: c.overlay, padding: 32 }]}>
              <View style={[styles.card, { backgroundColor: c.surface }]}>
                <Lock size={22} color={c.drop} />
                <Txt v="overline" color={c.drop} style={{ marginTop: 10 }}>{t('drop.title')}</Txt>
                <Txt style={{ fontFamily: fonts.serif, fontSize: 36, color: c.text, marginTop: 4 }}>{fullWord(today, s.active)}</Txt>
                <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 6, marginBottom: 16 }}>{t('drop.locked')}</Txt>
                <Button title={t('drop.open')} variant="drop" onPress={() => router.push('/drop')} style={{ alignSelf: 'stretch' }} />
              </View>
            </Animated.View>
          )}
          {!locked && posts.isSuccess && points.length === 0 && (
            <Animated.View entering={FadeIn} pointerEvents="none" style={[styles.emptyPill, { backgroundColor: c.surface, bottom: TAB_BAR_HEIGHT + 28 }]}>
              <Txt v="captionMedium">{t('map.empty')}</Txt>
              <Txt v="caption" color={c.textSecondary}>{t('map.emptySub')}</Txt>
            </Animated.View>
          )}
          {/* basemap style */}
          <View style={[styles.styles, { backgroundColor: c.surface, bottom: TAB_BAR_HEIGHT + 152 }]}>
            {(['color', 'satellite', 'minimal'] as const).map((st) => (
              <Pressable key={st} onPress={() => { haptic.light(); useApp.getState().updateSettings({ mapStyle: st }); }} accessibilityLabel={t(`map.styles.${st}`)}
                style={[styles.styleBtn, { borderColor: mapStyle === st ? c.accent : 'transparent' }]}>
                <View style={[styles.styleSwatch, { backgroundColor: st === 'color' ? '#9FD3A8' : st === 'satellite' ? '#1F4E5A' : '#D9D9D6' }]}>
                  <View style={{ position: 'absolute', left: 4, top: 6, width: 14, height: 10, borderRadius: 5, backgroundColor: st === 'color' ? '#F4E3A1' : st === 'satellite' ? '#3E7B4F' : '#EFEFEC' }} />
                  <View style={{ position: 'absolute', right: 3, bottom: 4, width: 12, height: 12, borderRadius: 6, backgroundColor: st === 'color' ? '#7FB5E6' : st === 'satellite' ? '#0E2B3A' : '#C4C4C0' }} />
                </View>
              </Pressable>
            ))}
          </View>
          {(posts.isLoading || status === 'idle') && <ActivityIndicator style={{ position: 'absolute', alignSelf: 'center', top: '50%' }} color={c.textSecondary} />}
          {status === 'offline' && (
            <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
              <View style={[styles.card, { backgroundColor: c.surface }]}><Txt v="callout" center>{t('social.offline')}</Txt></View>
            </View>
          )}
          <Pressable
            onPress={async () => {
              setLocating(true);
              const r = await getMyCity();
              setLocating(false);
              if (r) setMe([r.lat, r.lng]);
            }}
            style={[styles.locate, { backgroundColor: c.surface, bottom: TAB_BAR_HEIGHT + 104 }]}
            accessibilityLabel="locate"
          >
            {locating ? <ActivityIndicator size="small" color={c.text} /> : <LocateFixed size={18} color={me ? '#3B82F6' : c.text} />}
          </Pressable>
          {selected && <Preview post={selected} onClose={() => setSelected(null)} />}
        </View>
      ) : (
        <Feed />
      )}

      {/* top controls */}
      <View style={[styles.top, { paddingTop: insets.top + 8, paddingBottom: mode === 'feed' ? 8 : 0, backgroundColor: mode === 'feed' ? c.background : 'transparent' }]} pointerEvents="box-none">
        <View style={{ maxWidth: 720, width: '100%', alignSelf: 'center', paddingHorizontal: 16, gap: 10 }} pointerEvents="box-none">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Segmented
              value={mode}
              onChange={(m) => { setMode(m); setSelected(null); }}
              options={[{ value: 'feed', label: t('map.feedView') }, { value: 'map', label: t('map.mapView') }]}
              style={{ flex: 1, backgroundColor: mode === 'map' ? glass : c.surfaceAlt }}
            />
            <Pressable onPress={() => router.push('/people')} style={[styles.iconBtn, { backgroundColor: mode === 'map' ? glass : c.surfaceAlt }]} accessibilityLabel={t('social.findPeople')}>
              <UserPlus size={18} color={c.text} />
            </Pressable>
          </View>
          {mode === 'map' && (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['all', 'drop', 'word', 'following'] as Layer[]).map((l) => (
                  <Chip
                    key={l}
                    label={l === 'all' ? t('map.everything') : l === 'drop' ? t('map.layers.drop') : l === 'word' ? t('map.layers.any') : t('map.layers.friends')}
                    selected={layer === l}
                    tone={l === 'drop' ? 'drop' : undefined}
                    onPress={() => { setLayer(l); setSelected(null); }}
                  />
                ))}
                <Chip label={t('map.howWorldSays')} icon={<Languages size={14} color={words ? c.background : c.text} />} selected={words} onPress={() => setWords((w) => !w)} />
              </View>
              {layer === 'word' && (
                <View>
                  <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.divider }]}>
                    <Search size={18} color={c.textSecondary} />
                    <TextInput value={q} onChangeText={setQ} placeholder={`${t('map.searchWord')} · ${fullWord(concept, s.active)}`} placeholderTextColor={c.textTertiary} style={[styles.input, { color: c.text }]} autoCorrect={false} />
                  </View>
                  {suggestions.length > 0 && (
                    <Animated.View entering={FadeInDown} style={[styles.suggest, { backgroundColor: c.surface, borderColor: c.divider }]}>
                      {suggestions.map((cc) => (
                        <Pressable key={cc.id} onPress={() => { setConcept(cc.id); setQ(''); }} style={styles.sugRow}>
                          <View style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden' }}>
                            <Photo uri={coverFor(cc.id, 100)} style={{ width: '100%', height: '100%' }} />
                          </View>
                          <Txt v="bodyMedium" style={{ flex: 1 }}>{fullWord(cc.id, s.active)}</Txt>
                          <Txt v="caption" color={c.textSecondary}>{labelOf(cc.id, s.native)?.word}</Txt>
                        </Pressable>
                      ))}
                    </Animated.View>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

/* ---------------- marker preview ---------------- */
function Preview({ post, onClose }: { post: PostRow; onClose: () => void }) {
  const { c } = useTheme();
  const s = useApp((x) => x.settings);
  const label = post.concept_id ? labelOf(post.concept_id, (post.lang ?? 'en') as LangCode) : undefined;
  return (
    <Animated.View entering={SlideInDown.springify().damping(20)} exiting={SlideOutDown.duration(180)} style={[styles.preview, { bottom: TAB_BAR_HEIGHT + 12 }]}>
      <PressableScale onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })} style={[styles.previewCard, { backgroundColor: c.surface }]}>
        <View style={{ width: 92, height: 92, borderRadius: radius.m, overflow: 'hidden' }}>
          <Photo uri={post.photo_url ?? undefined} style={{ width: '100%', height: '100%' }} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Avatar seed={post.author_id} size={20} label={post.author.handle} uri={post.author.avatar_url} />
            <Txt v="captionMedium" numberOfLines={1}>@{post.author.handle}</Txt>
          </View>
          {label ? <Txt style={{ fontFamily: fonts.serif, fontSize: 24, color: c.text }} numberOfLines={1}>{label.word}</Txt> : null}
          {post.concept_id ? <Txt v="caption" color={c.textSecondary}>{fullWord(post.concept_id, s.active)}</Txt> : null}
          {post.body ? <Txt v="caption" color={c.textSecondary} numberOfLines={1}>{post.body}</Txt> : null}
          {post.place ? <Txt v="caption" color={c.textTertiary} numberOfLines={1}>{post.place}</Txt> : null}
        </View>
        <Pressable onPress={onClose} hitSlop={10} style={{ alignSelf: 'flex-start' }}><X size={18} color={c.textTertiary} /></Pressable>
      </PressableScale>
    </Animated.View>
  );
}

/* ---------------- Threads-style feed ---------------- */
function Feed() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const status = useNet((x) => x.status);
  const [tab, setTab] = useState<'for_you' | 'following'>('for_you');
  const q = useInfiniteQuery({
    queryKey: ['feed', tab],
    queryFn: ({ pageParam }) => feed(tab, pageParam || undefined),
    initialPageParam: '',
    getNextPageParam: (last) => (last.length >= 20 ? last[last.length - 1].created_at : undefined),
    enabled: status === 'ok',
  });
  const posts = useMemo(() => q.data?.pages.flat() ?? [], [q.data]);
  const liked = useLikedSet(posts);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item, index }) => <PostCard post={item} i={index % 20} liked={liked.has(item.id)} />}
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: TAB_BAR_HEIGHT + 90, paddingHorizontal: 16, maxWidth: 680, width: '100%', alignSelf: 'center' }}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={q.isRefetching}
        onRefresh={() => q.refetch()}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
            <Chip label={t('social.forYou')} selected={tab === 'for_you'} onPress={() => setTab('for_you')} />
            <Chip label={t('social.followingFeed')} selected={tab === 'following'} onPress={() => setTab('following')} />
          </View>
        }
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator style={{ margin: 20 }} color={c.textSecondary} /> : undefined}
        ListEmptyComponent={
          q.isLoading || status === 'idle' ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={c.textSecondary} />
          ) : status === 'offline' || q.isError ? (
            <EmptyState title={t('social.offline')} cta={t('social.retry')} onCta={() => { connect(); q.refetch(); }} />
          ) : tab === 'following' ? (
            <EmptyState title={t('social.emptyFeed')} sub={t('social.emptyFollowing')} cta={t('social.findPeople')} onCta={() => router.push('/people')} />
          ) : (
            <EmptyState title={t('social.emptyFeed')} sub={t('social.emptyFeedSub')} cta={t('social.newPost')} onCta={() => router.push('/compose')} />
          )
        }
      />
      <PressableScale onPress={() => router.push('/compose')} style={[styles.fab, { backgroundColor: c.ink, bottom: TAB_BAR_HEIGHT + 18 }]}>
        <PenSquare size={22} color={c.background} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 360, padding: 24, borderRadius: radius.xl, alignItems: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.s, paddingHorizontal: 12, height: 44, borderWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, height: 44 },
  suggest: { marginTop: 6, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sugRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyPill: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, alignItems: 'center', boxShadow: '0 6px 18px rgba(0,0,0,.18)', maxWidth: '86%' },
  styles: { position: 'absolute', right: 10, padding: 4, borderRadius: 14, gap: 4, boxShadow: '0 6px 18px rgba(0,0,0,.18)' },
  styleBtn: { borderRadius: 10, borderWidth: 2, padding: 1 },
  styleSwatch: { width: 30, height: 30, borderRadius: 8, overflow: 'hidden' },
  locate: { position: 'absolute', right: 10, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  preview: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  previewCard: { flexDirection: 'row', gap: 12, padding: 10, borderRadius: radius.l, width: '100%', maxWidth: 520, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, elevation: 8 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
});
