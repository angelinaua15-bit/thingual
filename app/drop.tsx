import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, ImageStyle, StyleProp } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { ImageIcon, Lock, RotateCcw, ShieldCheck, Sparkles, X } from 'lucide-react-native';
import { Button, Txt, Segmented } from '../src/components/ui';
import { Photo } from '../src/components/Photo';
import { TimerRing, toast, monoStyle } from '../src/components/Overlay';
import { WorldMap } from '../src/components/WorldMap';
import { PostCard } from '../src/components/PostCard';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { dropFor, dropReleaseTime, DROP_WINDOW_MS, WORLD_POSTS, dateKey } from '../src/data/social';
import { fullWord, labelOf } from '../src/data/concepts';
import { photosFor, unsplash } from '../src/data/photos';
import { haptic } from '../src/lib/feedback';
import { ensureCanPublish, getMyCity } from '../src/lib/publish';

export default function Drop() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const s = useApp((x) => x.settings);
  const drops = useApp((x) => x.drops);
  const myPosts = useApp((x) => x.myPosts);
  const blocked = useApp((x) => x.blocked);
  const publish = useApp((x) => x.publish);
  const saveWord = useApp((x) => x.saveWord);
  const dropStreak = useApp((x) => x.dropStreak);
  const concept = dropFor();
  const release = dropReleaseTime();
  const [now, setNow] = useState(Date.now());
  const openedAt = useRef(Date.now());
  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const myDropId = drops[dateKey()];
  const myDrop = myPosts.find((p) => p.id === myDropId);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const released = s.demoMode || now >= release.getTime();
  const start = s.demoMode ? openedAt.current : Math.max(release.getTime(), 0);
  const leftMs = Math.max(0, start + DROP_WINDOW_MS - now);
  const late = leftMs === 0;
  const mm = Math.floor(leftMs / 60000);
  const ss = Math.floor((leftMs % 60000) / 1000);

  const capture = async () => {
    try {
      const pic = await camRef.current?.takePictureAsync({ quality: 0.5, base64: Platform.OS === 'web' });
      if (!pic) return;
      setShot(Platform.OS === 'web' && pic.base64 ? `data:image/jpeg;base64,${pic.base64}` : pic.uri);
      haptic.success();
    } catch {
      toast(t('camera.noPermission'), 'default');
    }
  };
  const fromGallery = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: Platform.OS === 'web' });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    setShot(Platform.OS === 'web' && a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
  };
  const demo = () => {
    const p = photosFor(concept).find((x) => !x.place) ?? photosFor(concept)[0];
    setShot(unsplash(p.path, 1000));
  };

  const post = async () => {
    if (!shot || !ensureCanPublish()) return;
    setPosting(true);
    const city = await getMyCity();
    const lateMin = late ? Math.round((now - start - DROP_WINDOW_MS) / 60000) + 1 : undefined;
    publish({ concept, photo: shot, authorLang: s.active, isDrop: true, lateMinutes: lateMin, place: city?.place, lat: city?.lat, lng: city?.lng });
    saveWord(concept, shot, 'drop');
    setPosting(false);
    haptic.success();
  };

  /* -------- reveal (after posting) -------- */
  if (myDrop) return <Reveal concept={concept} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.close}>
          <X size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt v="overline" color="#FF8A5B">{t('drop.title')}</Txt>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center', paddingHorizontal: space.l }}>
        <Txt style={{ fontFamily: fonts.serif, fontSize: 52, lineHeight: 56, color: '#fff', textAlign: 'center' }}>{fullWord(concept, s.active)}</Txt>
        <Txt v="callout" color="rgba(255,255,255,0.6)">{labelOf(concept, s.native)?.word} · {t('drop.sub')}</Txt>
      </Animated.View>

      {!released ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.l }}>
          <Lock size={28} color="rgba(255,255,255,0.6)" />
          <Txt v="body" color="rgba(255,255,255,0.75)" center style={{ marginTop: 14 }}>{t('drop.notYet')}</Txt>
        </View>
      ) : (
        <View style={{ flex: 1, padding: space.m, alignItems: 'center' }}>
          <View style={{ width: Math.min(width - 32, 480), flex: 1, maxHeight: height * 0.58, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: '#1A1A1A' }}>
            {shot ? (
              <Animated.View entering={ZoomIn.springify().damping(16)} style={StyleSheet.absoluteFill}>
                <Photo uri={shot} style={StyleSheet.absoluteFill as StyleProp<ImageStyle>} />
              </Animated.View>
            ) : perm?.granted ? (
              <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back" />
            ) : (
              <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 }]}>
                <Txt v="callout" color="rgba(255,255,255,0.7)" center>{t('camera.noPermissionSub')}</Txt>
                <Button title={t('camera.grant')} variant="inverse" size="m" onPress={requestPerm} />
              </View>
            )}
            <View style={styles.timer}>
              <TimerRing size={64} progress={leftMs / DROP_WINDOW_MS} color="#FF6B35">
                <Txt style={[{ color: '#fff', fontSize: 15 }, monoStyle]}>{late ? '0:00' : `${mm}:${String(ss).padStart(2, '0')}`}</Txt>
              </TimerRing>
            </View>
            {late && (
              <View style={[styles.lateTag]}>
                <Txt v="captionMedium" color="#fff">{t('map.late')}</Txt>
              </View>
            )}
          </View>

          <View style={{ width: Math.min(width - 32, 480), marginTop: 16, gap: 10 }}>
            {!shot ? (
              <>
                {perm?.granted && (
                  <Pressable onPress={capture} style={styles.shutterWrap}>
                    <View style={styles.shutter} />
                  </Pressable>
                )}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button title={t('drop.fromGallery')} variant="secondary" size="m" icon={<ImageIcon size={16} color={c.text} />} onPress={fromGallery} style={{ flex: 1 }} />
                  <Button title={t('drop.demoPhoto')} variant="secondary" size="m" icon={<Sparkles size={16} color={c.text} />} onPress={demo} style={{ flex: 1 }} />
                </View>
              </>
            ) : (
              <Animated.View entering={FadeInUp} style={{ gap: 10 }}>
                <Button title={t('drop.post')} variant="drop" onPress={post} loading={posting} />
                <Button title={t('drop.retake')} variant="secondary" icon={<RotateCcw size={16} color={c.text} />} onPress={() => setShot(null)} />
              </Animated.View>
            )}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 4 }}>
              <ShieldCheck size={14} color="rgba(255,255,255,0.5)" style={{ marginTop: 2 }} />
              <Txt v="caption" color="rgba(255,255,255,0.5)" style={{ flex: 1 }}>{t('drop.faces')}</Txt>
            </View>
            {s.demoMode && <Txt v="caption" color="rgba(255,255,255,0.35)" center>{t('drop.notYetDemo')}</Txt>}
          </View>
        </View>
      )}

      {/* locked preview of the world */}
      <View style={{ height: 64 + insets.bottom, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16 }}>
          {WORLD_POSTS.filter((p) => p.isDrop && !blocked.includes(p.authorId)).slice(0, 8).map((p) => (
            <View key={p.id} style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden' }}>
              <Photo uri={p.photo.replace('w=900', 'w=120')} style={{ width: '100%', height: '100%' }} />
            </View>
          ))}
        </View>
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14,14,14,0.75)', backdropFilter: 'blur(8px)' } as object]} />
        ) : (
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: insets.bottom }]}>
          <Lock size={14} color="rgba(255,255,255,0.7)" />
          <Txt v="caption" color="rgba(255,255,255,0.7)">{t('drop.locked')}</Txt>
        </View>
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
  const myPosts = useApp((x) => x.myPosts);
  const blocked = useApp((x) => x.blocked);
  const dropStreak = useApp((x) => x.dropStreak);
  const [view, setView] = useState<'photos' | 'words'>('photos');
  const posts = useMemo(() => {
    const mine = myPosts.filter((p) => p.isDrop && p.concept === concept);
    return [...mine, ...WORLD_POSTS.filter((p) => p.isDrop && p.concept === concept && !blocked.includes(p.authorId))];
  }, [myPosts, blocked]);
  const countries = new Set(posts.map((p) => p.place?.split(',').pop()?.trim()).filter(Boolean)).size;
  const langs = new Set(posts.map((p) => p.authorLang)).size;
  const points = posts.filter((p) => p.lat !== undefined).map((p) => ({
    id: p.id, lat: p.lat!, lng: p.lng!, photo: p.photo.replace('w=900', 'w=160'), label: labelOf(p.concept, p.authorLang)!.word, sub: p.authorLang, highlight: p.mine,
  }));
  const recap = myPosts.filter((p) => p.isDrop).slice(0, 7);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={{ height: height * 0.55, maxHeight: 560 }}>
          <WorldMap points={points} wordsMode={view === 'words'} onSelect={(id) => router.push({ pathname: '/post/[id]', params: { id } })} />
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }} pointerEvents="none" />
          <View style={[styles.header, { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.close, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
              <X size={22} color="#fff" />
            </Pressable>
            <View style={{ flex: 1 }} />
          </View>
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16, alignItems: 'center' }}>
            <Segmented
              style={{ width: 320, backgroundColor: 'rgba(242,241,237,0.94)' }}
              value={view}
              onChange={setView}
              options={[{ value: 'photos', label: t('map.mapView') }, { value: 'words', label: t('map.howWorldSays') }]}
            />
          </View>
        </View>
        <View style={{ padding: space.m, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <Txt v="overline" color={c.drop}>{t('drop.title')} · {t('drop.posted')}</Txt>
            <Txt style={{ fontFamily: fonts.serif, fontSize: 44, lineHeight: 48, color: c.text, marginTop: 6 }}>{t('drop.reveal', { word: fullWord(concept, s.active) })}</Txt>
            <Txt v="callout" color={c.textSecondary} style={{ marginTop: 6 }}>{t('drop.stats', { photos: posts.length, countries, langs })}</Txt>
            <Txt v="captionMedium" color={c.drop} style={{ marginTop: 4 }}>{t('drop.streak', { n: dropStreak.count })}</Txt>
          </Animated.View>

          {recap.length > 0 && (
            <Animated.View entering={FadeIn.delay(200)} style={{ marginTop: space.l }}>
              <Txt v="headline" style={{ marginBottom: 10 }}>{t('drop.weekRecap')}</Txt>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {recap.map((p) => (
                  <View key={p.id} style={{ flex: 1, aspectRatio: 0.75, borderRadius: 10, overflow: 'hidden', maxWidth: 90 }}>
                    <Photo uri={p.photo} style={{ width: '100%', height: '100%' }} />
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          <View style={{ marginTop: space.l }}>
            {posts.map((p, i) => <PostCard key={p.id} post={p} i={i} />)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  timer: { position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 40 },
  lateTag: { position: 'absolute', top: 18, left: 14, backgroundColor: 'rgba(255,107,53,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  shutterWrap: { alignSelf: 'center', width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FF6B35', alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
});
