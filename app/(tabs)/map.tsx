import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Languages, Lock, MapPin, Search } from 'lucide-react-native';
import { Txt, Chip, Segmented, Button, PressableScale, EmptyState } from '../../src/components/ui';
import { Photo } from '../../src/components/Photo';
import { WorldMap } from '../../src/components/WorldMap';
import { PostCard } from '../../src/components/PostCard';
import { useTheme, fonts, radius, space, TAB_BAR_HEIGHT } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { CHALLENGES, WORLD_POSTS, dropFor, dateKey, friendPosts, Post, THEMED_SETS } from '../../src/data/social';
import { CONCEPTS, fullWord, labelOf } from '../../src/data/concepts';
import { coverFor, unsplash, photosFor } from '../../src/data/photos';
import { getMyCity } from '../../src/lib/publish';

type Layer = 'drop' | 'any' | 'near' | 'friends';
type FeedTab = 'friends' | 'world' | 'collections';

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, d = Math.PI / 180;
  const x = Math.sin(((b.lat - a.lat) * d) / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(((b.lng - a.lng) * d) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

export default function MapTab() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ concept?: string }>();
  const s = useApp((x) => x.settings);
  const myPosts = useApp((x) => x.myPosts);
  const blocked = useApp((x) => x.blocked);
  const reported = useApp((x) => x.reported);
  const drops = useApp((x) => x.drops);
  const [mode, setMode] = useState<'map' | 'feed'>('map');
  const [layer, setLayer] = useState<Layer>('drop');
  const [concept, setConcept] = useState<string>(dropFor());
  const [q, setQ] = useState('');
  const [words, setWords] = useState(false);
  const [me, setMe] = useState<{ lat: number; lng: number; place: string } | null>(null);
  const [feedTab, setFeedTab] = useState<FeedTab>('world');
  const dropPosted = !!drops[dateKey()];
  const today = dropFor();

  useEffect(() => {
    if (params.concept) {
      setMode('map');
      setLayer('any');
      setConcept(params.concept);
    }
  }, [params.concept]);

  const visible = (p: Post) => !blocked.includes(p.authorId) && !reported.includes(p.id);
  const all = useMemo(() => [...myPosts, ...WORLD_POSTS].filter(visible), [myPosts, blocked, reported]);

  const layerPosts = useMemo(() => {
    if (layer === 'drop') return all.filter((p) => p.isDrop && p.concept === today);
    if (layer === 'any') return all.filter((p) => p.concept === concept);
    if (layer === 'friends') return [...myPosts, ...friendPosts()].filter(visible);
    if (layer === 'near') return me ? all.filter((p) => p.lat !== undefined && km(me, { lat: p.lat!, lng: p.lng! }) < 400) : [];
    return all;
  }, [layer, concept, all, me]);

  const points = layerPosts.filter((p) => p.lat !== undefined).map((p) => ({
    id: p.id, lat: p.lat!, lng: p.lng!, photo: p.photo.replace('w=900', 'w=160'), label: labelOf(p.concept, p.authorLang)!.word, sub: p.authorLang, highlight: !!p.mine,
  }));
  const countries = new Set(layerPosts.map((p) => p.place?.split(',').pop()?.trim()).filter(Boolean)).size;
  const langs = new Set(layerPosts.map((p) => p.authorLang)).size;
  const locked = layer === 'drop' && !dropPosted;

  const suggestions = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return CONCEPTS.filter((cc) => Object.values(cc.labels).some((l) => l.word.toLowerCase().startsWith(query))).slice(0, 6);
  }, [q]);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {mode === 'map' ? (
        <View style={{ flex: 1 }}>
          <WorldMap
            points={locked ? [] : points}
            wordsMode={words}
            onSelect={(id) => router.push({ pathname: '/post/[id]', params: { id } })}
            center={layer === 'near' && me ? [me.lat, me.lng] : undefined}
            zoom={layer === 'near' && me ? 7 : undefined}
          />
          {locked && (
            <Animated.View entering={FadeIn} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: c.overlay, padding: 32 }]}>
              <View style={[styles.lockCard, { backgroundColor: c.surface }]}>
                <View style={{ flexDirection: 'row', marginBottom: 14 }}>
                  {photosFor(today).slice(0, 3).map((p, i) => (
                    <View key={p.id} style={{ width: 56, height: 70, borderRadius: 12, overflow: 'hidden', marginLeft: i ? -18 : 0, transform: [{ rotate: `${(i - 1) * 8}deg` }], borderWidth: 2, borderColor: c.surface }}>
                      <Photo uri={unsplash(p.path, 160)} style={{ width: '100%', height: '100%' }} />
                    </View>
                  ))}
                </View>
                <Txt v="overline" color={c.drop}>{t('drop.title')}</Txt>
                <Txt style={{ fontFamily: fonts.serif, fontSize: 36, color: c.text, marginTop: 4 }}>{fullWord(today, s.active)}</Txt>
                <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 6, marginBottom: 16 }}>{t('drop.locked')}</Txt>
                <Button title={t('drop.open')} variant="drop" onPress={() => router.push('/drop')} style={{ alignSelf: 'stretch' }} />
              </View>
            </Animated.View>
          )}
          {layer === 'near' && !me && (
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
              <View style={[styles.lockCard, { backgroundColor: c.surface }]}>
                <MapPin size={26} color={c.text} />
                <Txt v="callout" color={c.textSecondary} center style={{ marginVertical: 12 }}>{t('map.nearEmpty')}</Txt>
                <Button title={t('map.allowLocation')} onPress={async () => setMe(await getMyCity())} style={{ alignSelf: 'stretch' }} />
              </View>
            </View>
          )}
        </View>
      ) : (
        <Feed tab={feedTab} setTab={setFeedTab} dropPosted={dropPosted} />
      )}

      {/* top controls */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={{ maxWidth: 720, width: '100%', alignSelf: 'center', paddingHorizontal: 16, gap: 10 }} pointerEvents="box-none">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[{ value: 'map', label: t('map.mapView') }, { value: 'feed', label: t('map.feedView') }]}
            style={{ backgroundColor: mode === 'map' ? 'rgba(242,241,237,0.92)' : c.surfaceAlt }}
          />
          {mode === 'map' && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {(['drop', 'any', 'near', 'friends'] as Layer[]).map((l) => (
                  <Chip key={l} label={t(`map.layers.${l}`)} selected={layer === l} tone={l === 'drop' ? 'drop' : undefined} onPress={() => setLayer(l)} />
                ))}
                <Chip label={t('map.howWorldSays')} icon={<Languages size={14} color={words ? c.background : c.text} />} selected={words} onPress={() => setWords((w) => !w)} />
              </ScrollView>
              {layer === 'any' && (
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

      {mode === 'map' && !locked && points.length > 0 && (
        <View style={[styles.counter, { bottom: TAB_BAR_HEIGHT + 16 }]} pointerEvents="none">
          <View style={[styles.counterPill, { backgroundColor: c.surface }]}>
            <Txt v="captionMedium">{t('drop.stats', { photos: layerPosts.length, countries, langs })}</Txt>
          </View>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
function Feed({ tab, setTab, dropPosted }: { tab: FeedTab; setTab: (t: FeedTab) => void; dropPosted: boolean }) {
  const { c } = useTheme();
  const { t, code } = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = useApp((x) => x.settings);
  const myPosts = useApp((x) => x.myPosts);
  const friends = useApp((x) => x.friends);
  const blocked = useApp((x) => x.blocked);
  const reported = useApp((x) => x.reported);
  const visible = (p: Post) => !blocked.includes(p.authorId) && !reported.includes(p.id);
  const today = dropFor();

  const world = useMemo(
    () => [...myPosts, ...WORLD_POSTS].filter(visible).filter((p) => dropPosted || !(p.isDrop && p.concept === today && !p.mine)).sort((a, b) => b.createdAt - a.createdAt),
    [myPosts, blocked, reported, dropPosted],
  );
  const fr = useMemo(() => [...myPosts, ...friendPosts().filter((p) => friends.includes(p.authorId))].filter(visible).sort((a, b) => b.createdAt - a.createdAt), [myPosts, friends]);
  const challenge = CHALLENGES[Math.floor(Date.now() / (7 * 86400000)) % CHALLENGES.length];
  const cardW = Math.min(width, 640) - 32;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: TAB_BAR_HEIGHT + 40 }}>
      <View style={{ maxWidth: 640, width: '100%', alignSelf: 'center', paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['friends', 'world', 'collections'] as FeedTab[]).map((f) => <Chip key={f} label={t(`map.feedTabs.${f}`)} selected={tab === f} onPress={() => setTab(f)} />)}
        </View>

        {tab === 'world' && (
          <>
            <PressableScale onPress={() => router.push({ pathname: '/(tabs)/map', params: { concept: challenge.concept } })} style={[styles.challenge, { height: cardW * 0.5 }]}>
              <Photo uri={coverFor(challenge.concept, 1000)} style={StyleSheet.absoluteFill as never} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
              <View style={{ position: 'absolute', left: 16, bottom: 14, right: 16 }}>
                <Txt v="overline" color="rgba(255,255,255,0.75)">{t('map.challenge')}</Txt>
                <Txt style={{ fontFamily: fonts.serif, fontSize: 34, color: '#fff' }}>{challenge.title[code === 'uk' ? 'uk' : 'en']}</Txt>
              </View>
            </PressableScale>
            {world.map((p, i) => <PostCard key={p.id} post={p} i={i} />)}
          </>
        )}
        {tab === 'friends' && (fr.length ? fr.map((p, i) => <PostCard key={p.id} post={p} i={i} />) : <EmptyState title={t('map.noFriends')} />)}
        {tab === 'collections' && (
          <View style={{ gap: 12 }}>
            <Txt v="headline">{t('map.publicCollections')}</Txt>
            {THEMED_SETS.map((set, i) => (
              <Animated.View key={set.id} entering={FadeInDown.delay(i * 70)}>
                <PressableScale onPress={() => router.push({ pathname: '/word/[id]', params: { id: set.concepts[0] } })} style={[styles.collection, { backgroundColor: c.surface, borderColor: c.divider }]}>
                  <View style={{ flexDirection: 'row', gap: 4, height: 110 }}>
                    {set.concepts.slice(0, 4).map((id) => (
                      <View key={id} style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}>
                        <Photo uri={coverFor(id, 300)} style={{ width: '100%', height: '100%' }} />
                      </View>
                    ))}
                  </View>
                  <Txt v="bodyMedium" style={{ marginTop: 10 }}>{t(`dictionary.setNames.${set.id}`)}</Txt>
                  <Txt v="caption" color={c.textSecondary}>{set.concepts.map((id) => labelOf(id, s.active)?.word).join(' · ')}</Txt>
                </PressableScale>
              </Animated.View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.s, paddingHorizontal: 12, height: 44, borderWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, height: 44 },
  suggest: { marginTop: 6, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sugRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  lockCard: { width: '100%', maxWidth: 360, padding: 24, borderRadius: radius.xl, alignItems: 'center' },
  counter: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  counterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, elevation: 4 },
  challenge: { borderRadius: radius.l, overflow: 'hidden', marginBottom: 22 },
  collection: { padding: 12, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
});
