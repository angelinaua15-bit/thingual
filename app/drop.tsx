import { PhotoRejected } from '../src/lib/api';
import { BrandBackground } from '../src/components/BrandBackground';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, ImageStyle, StyleProp } from 'react-native';
import { goBack } from '../src/lib/nav';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { ImageIcon, Lock, RotateCcw, ShieldCheck, X } from '../src/components/icons';
import { Button, Txt, Segmented } from '../src/components/ui';
import { Photo } from '../src/components/Photo';
import { TimerRing, toast, monoStyle } from '../src/components/Overlay';
import { WorldMap } from '../src/components/WorldMap';
import { PostCard } from '../src/components/PostCard';
import { LiveCamera, type CameraStatus, type LiveCameraHandle } from '../src/components/LiveCamera';
import { useTheme, fonts, radius, space, BRAND } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { dropFor, dropReleaseTime, DROP_WINDOW_MS, dateKey } from '../src/data/social';
import { fullWord, labelOf } from '../src/data/concepts';
import { LangCode } from '../src/data/languages';
import { haptic } from '../src/lib/feedback';
import { ensureCanPublish, getMyCity } from '../src/lib/publish';
import { pickImage } from '../src/lib/pickImage';
import { createPost, dropPosts, myDropToday } from '../src/lib/api';
import { useLikedSet, useNet } from '../src/lib/queries';
import { visibleStreak } from '../src/lib/streak';

export default function Drop() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const qc = useQueryClient();
  const s = useApp((x) => x.settings);
  const markDrop = useApp((x) => x.markDrop);
  const saveWord = useApp((x) => x.saveWord);
  const net = useNet((x) => x.status);
  const concept = dropFor();
  const release = dropReleaseTime();
  const [now, setNow] = useState(Date.now());
  const camRef = useRef<LiveCameraHandle>(null);
  const [camStatus, setCamStatus] = useState<CameraStatus>('loading');
  const [shot, setShot] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const mine = useQuery({ queryKey: ['myDrop', dateKey()], queryFn: () => myDropToday(dateKey()), enabled: net === 'ok' });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const released = now >= release.getTime();
  const leftMs = Math.max(0, release.getTime() + DROP_WINDOW_MS - now);
  const late = leftMs === 0;
  const mm = Math.floor(leftMs / 60000);
  const ss = Math.floor((leftMs % 60000) / 1000);
  const releaseLabel = release.toLocaleTimeString(s.uiLang, { hour: '2-digit', minute: '2-digit' });

  const capture = async () => {
    const r = await camRef.current?.capture();
    if (r) {
      setShot(r.uri);
      haptic.success();
    }
  };

  const post = async () => {
    if (!shot || !ensureCanPublish()) return;
    setPosting(true);
    try {
      const city = await getMyCity();
      const lateMin = late ? Math.round((now - release.getTime() - DROP_WINDOW_MS) / 60000) + 1 : null;
      const p = await createPost({
        photoUri: shot, concept_id: concept, lang: s.active, is_drop: true, drop_day: dateKey(), late_minutes: lateMin,
        place: city?.place ?? null, lat: city?.lat ?? null, lng: city?.lng ?? null,
      });
      markDrop(p.id);
      saveWord(concept, p.photo_url ?? shot, 'drop');
      qc.setQueryData(['myDrop', dateKey()], p);
      qc.invalidateQueries({ queryKey: ['feed'] });
      haptic.success();
    } catch (e) {
      toast(e instanceof PhotoRejected ? t('safety.rejected') : t('social.offline'), 'default');
    } finally {
      setPosting(false);
    }
  };

  if (mine.data) return <Reveal concept={concept} />;

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.deep }}>
      <BrandBackground />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => goBack()} hitSlop={12} style={styles.close}><X size={22} color="#fff" /></Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}><Txt v="overline" color="#FF8A5B">{t('drop.title')}</Txt></View>
        <View style={{ width: 36 }} />
      </View>

      <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center', paddingHorizontal: space.l }}>
        <Txt style={{ fontFamily: fonts.serif, fontSize: 52, lineHeight: 56, color: '#fff', textAlign: 'center' }}>{fullWord(concept, s.active)}</Txt>
        <Txt v="callout" color="rgba(255,255,255,0.6)" center>{labelOf(concept, s.native)?.word} · {t('drop.sub')}</Txt>
      </Animated.View>

      {mine.isLoading && net === 'ok' ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#fff" />
      ) : !released ? (
        <View style={[styles.center, { flex: 1, padding: space.l }]}>
          <Lock size={28} color="rgba(255,255,255,0.6)" />
          <Txt v="body" color="rgba(255,255,255,0.75)" center style={{ marginTop: 14 }}>{t('drop.notYet')}</Txt>
          <Txt v="headline" color="#fff" style={{ marginTop: 8 }}>≈ {releaseLabel}</Txt>
        </View>
      ) : (
        <View style={{ flex: 1, padding: space.m, alignItems: 'center' }}>
          <View style={{ width: Math.min(width - 32, 480), flex: 1, maxHeight: height * 0.56, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: '#1A1A1A' }}>
            {shot ? (
              <Animated.View entering={ZoomIn.springify().damping(16)} style={StyleSheet.absoluteFill}>
                <Photo uri={shot} style={StyleSheet.absoluteFill as StyleProp<ImageStyle>} />
              </Animated.View>
            ) : (
              <LiveCamera ref={camRef} live={false} onStatus={setCamStatus} onTapDetection={() => {}} />
            )}
            {!shot && (camStatus === 'denied' || camStatus === 'nocamera') && (
              <View style={[StyleSheet.absoluteFill, styles.center, { padding: 24, gap: 10 }]}>
                <Txt v="callout" color="rgba(255,255,255,0.7)" center>{t('camera.deniedSub')}</Txt>
                {camStatus === 'denied' && <Button title={t('camera.grant')} variant="inverse" size="m" onPress={() => camRef.current?.request()} />}
              </View>
            )}
            <View style={styles.timer}>
              <TimerRing size={64} progress={leftMs / DROP_WINDOW_MS} color="#FF6B35">
                <Txt style={[{ color: '#fff', fontSize: 15 }, monoStyle]}>{late ? '0:00' : `${mm}:${String(ss).padStart(2, '0')}`}</Txt>
              </TimerRing>
            </View>
            {late && <View style={styles.lateTag}><Txt v="captionMedium" color="#fff">{t('map.late')}</Txt></View>}
          </View>

          <View style={{ width: Math.min(width - 32, 480), marginTop: 16, gap: 10 }}>
            {!shot ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
                <Pressable onPress={async () => { const u = await pickImage(); if (u) setShot(u); }} style={styles.side} accessibilityLabel={t('drop.fromGallery')}>
                  <ImageIcon size={22} color="#fff" />
                </Pressable>
                <Pressable onPress={capture} disabled={camStatus === 'denied' || camStatus === 'nocamera'} style={[styles.shutterWrap, { opacity: camStatus === 'denied' || camStatus === 'nocamera' ? 0.4 : 1 }]}>
                  <View style={styles.shutter} />
                </Pressable>
                <View style={styles.side} />
              </View>
            ) : (
              <Animated.View entering={FadeInUp} style={{ gap: 10 }}>
                <Button title={t('drop.post')} variant="drop" onPress={post} loading={posting} />
                <Button title={t('drop.retake')} variant="secondary" icon={<RotateCcw size={16} color={c.text} />} onPress={() => setShot(null)} />
              </Animated.View>
            )}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 4 }}>
              <ShieldCheck size={14} color="rgba(255,255,255,0.5)" style={{ marginTop: 2 }} />
              <Txt v="caption" color="rgba(255,255,255,0.5)" style={{ flex: 1 }}>{t('drop.privacyLocation')}</Txt>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.lockedBar, { paddingBottom: insets.bottom + 12 }]}>
        <Lock size={14} color="rgba(255,255,255,0.6)" />
        <Txt v="caption" color="rgba(255,255,255,0.6)">{t('drop.locked')}</Txt>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
function Reveal({ concept }: { concept: string }) {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const s = useApp((x) => x.settings);
  const dropStreak = useApp((x) => x.dropStreak);
  const uid = useNet((x) => x.uid);
  const [view, setView] = useState<'photos' | 'words'>('photos');
  const all = useQuery({ queryKey: ['dropAll', dateKey()], queryFn: () => dropPosts(dateKey(), concept) });
  const list = useMemo(() => all.data ?? [], [all.data]);
  const liked = useLikedSet(list);
  const countries = new Set(list.map((p) => p.place?.split(',').pop()?.trim()).filter(Boolean)).size;
  const langs = new Set(list.map((p) => p.lang)).size;
  const points = useMemo(
    () => list.filter((p) => p.lat !== null && p.photo_url).map((p) => ({ id: p.id, lat: p.lat!, lng: p.lng!, photo: p.photo_url!, label: labelOf(concept, (p.lang ?? 'en') as LangCode)?.word ?? '', sub: p.lang ?? '', highlight: p.author_id === uid })),
    [list, uid],
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={{ height: height * 0.5, maxHeight: 520 }}>
          <WorldMap points={points} wordsMode={view === 'words'} onSelect={(id) => router.push({ pathname: '/post/[id]', params: { id } })} />
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100 }} pointerEvents="none" />
          <View style={[styles.header, { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => goBack()} hitSlop={12} style={[styles.close, { backgroundColor: 'rgba(0,0,0,0.45)' }]}><X size={22} color="#fff" /></Pressable>
          </View>
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16, alignItems: 'center' }}>
            <Segmented style={{ width: 320, backgroundColor: 'rgba(242,241,237,0.94)' }} value={view} onChange={setView} options={[{ value: 'photos', label: t('map.mapView') }, { value: 'words', label: t('map.howWorldSays') }]} />
          </View>
        </View>
        <View style={{ padding: space.m, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <Txt v="overline" color={c.drop}>{t('drop.title')} · {t('drop.posted')}</Txt>
            <Txt style={{ fontFamily: fonts.serif, fontSize: 40, lineHeight: 44, color: c.text, marginTop: 6 }}>{t('drop.reveal', { word: fullWord(concept, s.active) })}</Txt>
            <Txt v="callout" color={c.textSecondary} style={{ marginTop: 6 }}>{t('drop.stats', { photos: list.length, countries, langs })}</Txt>
            <Txt v="captionMedium" color={c.drop} style={{ marginTop: 4 }}>{t('drop.streak', { n: visibleStreak(dropStreak) })}</Txt>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(200)} style={{ marginTop: space.m }}>
            {all.isLoading ? <ActivityIndicator color={c.textSecondary} /> : list.map((p, i) => <PostCard key={p.id} post={p} i={i} liked={liked.has(p.id)} />)}
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  timer: { position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 40 },
  lateTag: { position: 'absolute', top: 18, left: 14, backgroundColor: 'rgba(255,107,53,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  shutterWrap: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FF6B35', alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  side: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  lockedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 12 },
});
