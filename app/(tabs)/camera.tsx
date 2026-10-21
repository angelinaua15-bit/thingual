import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';
import { CameraOff, Check, ChevronDown, ImageIcon, RefreshCw, SwitchCamera } from 'lucide-react-native';
import { Txt, Button } from '../../src/components/ui';
import { Photo } from '../../src/components/Photo';
import { WordPeek, ConceptPicker } from '../../src/components/WordPeek';
import { LiveCamera, type CameraStatus, type LiveCameraHandle } from '../../src/components/LiveCamera';
import { Sheet, toast } from '../../src/components/Overlay';
import { useTheme, fonts, radius, TAB_BAR_HEIGHT } from '../../src/theme/tokens';
import { useT, languageName } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { recognize } from '../../src/lib/recognize';
import { detectUri, detectorSupported } from '../../src/lib/detect';
import type { Detection } from '../../src/lib/cocoMap';
import { fullWord, labelOf } from '../../src/data/concepts';
import { dropFor, dateKey } from '../../src/data/social';
import { LANGUAGES } from '../../src/data/languages';
import { haptic } from '../../src/lib/feedback';
import { pickImage } from '../../src/lib/pickImage';
import { openComposer } from '../../src/lib/draft';
import { myDropToday } from '../../src/lib/api';
import { useNet } from '../../src/lib/queries';

type Mode = 'object' | 'scene' | 'gallery' | 'drop';
const MODES: Mode[] = ['object', 'scene', 'gallery', 'drop'];

type Found = { concept: string | null; photo?: string; alternatives: string[]; confidence: number };

export default function CameraScreen() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const s = useApp((x) => x.settings);
  const localDrop = useApp((x) => x.drops[dateKey()]);
  const net = useNet((x) => x.status);
  const camRef = useRef<LiveCameraHandle>(null);
  const [mode, setMode] = useState<Mode>('object');
  const [focused, setFocused] = useState(true);
  const [status, setStatus] = useState<CameraStatus>('loading');
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [peekOpen, setPeekOpen] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | undefined | null>(null);
  const [scene, setScene] = useState<{ photo: string; concepts: string[] } | null>(null);
  const [sceneSel, setSceneSel] = useState<string[]>([]);
  const [langOpen, setLangOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  const myDrop = useQuery({ queryKey: ['myDrop', dateKey()], queryFn: () => myDropToday(dateKey()), enabled: net === 'ok' });
  const dropDone = !!localDrop || !!myDrop.data;
  const todayDrop = dropFor();

  const showPeek = (f: Found) => {
    setFound(f);
    setPeekOpen(true);
    haptic.success();
  };

  /** Many objects → scene list, one → card, none → server or manual pick. */
  const handleStill = async (photo: string, base64: string | undefined, detections: Detection[]) => {
    const uniq = [...new Set(detections.sort((a, b) => b.score - a.score).map((d) => d.concept))];
    if (uniq.length > 1 || mode === 'scene') {
      if (uniq.length) {
        setScene({ photo, concepts: uniq });
        setSceneSel(uniq);
        haptic.success();
        return;
      }
    }
    if (uniq.length === 1) return showPeek({ concept: uniq[0], photo, alternatives: [], confidence: 1 });
    const r = await recognize({ base64 });
    if (r.concept) return showPeek({ concept: r.concept, photo, alternatives: r.alternatives, confidence: r.confidence });
    toast(t('camera.nothingFound'), 'default');
    setPickerFor(photo);
  };

  const shoot = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const shot = await camRef.current?.capture();
      if (shot) await handleStill(shot.uri, shot.base64, shot.detections);
    } finally {
      setBusy(false);
    }
  };

  const fromGallery = async () => {
    const uri = await pickImage();
    if (!uri) return;
    setBusy(true);
    try {
      const dets = await detectUri(uri);
      let base64: string | undefined;
      if (!dets.length && uri.startsWith('data:')) base64 = uri.split(',')[1];
      await handleStill(uri, base64, dets);
    } finally {
      setBusy(false);
    }
  };

  const onMode = (m: Mode) => {
    haptic.light();
    if (m === 'drop') return router.push('/drop');
    if (m === 'gallery') return fromGallery();
    setScene(null);
    setMode(m);
  };

  const camAvailable = status !== 'denied' && status !== 'nocamera';
  const hint = mode === 'scene' ? t('camera.sceneHint') : detectorSupported && status !== 'nomodel' ? t('camera.pointAt') : t('camera.nativeHint');

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {focused && (
        <LiveCamera
          ref={camRef}
          live={mode === 'object' && !scene && !peekOpen}
          facing={facing}
          onStatus={setStatus}
          labelFor={(id) => labelOf(id, s.active)?.word ?? id}
          onTapDetection={(d, photo) => showPeek({ concept: d.concept, photo, alternatives: [], confidence: d.score })}
        />
      )}

      {!camAvailable && (
        <View style={[StyleSheet.absoluteFill, styles.center, { padding: 32 }]}>
          <CameraOff size={34} color="rgba(255,255,255,0.7)" />
          <Txt v="headline" color="#fff" center style={{ marginTop: 14 }}>{status === 'denied' ? t('camera.noPermission') : t('camera.noCamera')}</Txt>
          <Txt v="callout" color="rgba(255,255,255,0.65)" center style={{ marginTop: 6, marginBottom: 18, maxWidth: 320 }}>{t('camera.deniedSub')}</Txt>
          {status === 'denied' && <Button title={t('camera.grant')} variant="inverse" onPress={() => camRef.current?.request()} style={{ minWidth: 220 }} />}
          <Button title={t('camera.modes.gallery')} variant="secondary" icon={<ImageIcon size={16} color="#141414" />} onPress={fromGallery} style={{ minWidth: 220, marginTop: 10 }} />
        </View>
      )}

      <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={styles.gradTop} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.gradBottom} pointerEvents="none" />

      {/* scene results */}
      {scene && (
        <Animated.View entering={FadeIn} style={[StyleSheet.absoluteFill, styles.center, { padding: 24, backgroundColor: 'rgba(0,0,0,0.35)' }]}>
          <View style={styles.sceneCard}>
            <View style={{ height: 150, borderRadius: radius.m, overflow: 'hidden', marginBottom: 12 }}>
              <Photo uri={scene.photo} style={{ width: '100%', height: '100%' }} />
            </View>
            <Txt v="overline" color="rgba(255,255,255,0.6)" style={{ marginBottom: 8 }}>{t('camera.sceneFound', { n: scene.concepts.length })}</Txt>
            {scene.concepts.map((id, i) => {
              const sel = sceneSel.includes(id);
              return (
                <Animated.View key={id} entering={FadeInDown.delay(i * 90)}>
                  <Pressable onPress={() => setSceneSel((x) => (sel ? x.filter((y) => y !== id) : [...x, id]))} style={styles.sceneRow}>
                    <View style={[styles.checkbox, { backgroundColor: sel ? '#fff' : 'transparent' }]}>{sel && <Check size={14} color="#141414" />}</View>
                    <Txt style={{ fontFamily: fonts.serif, fontSize: 24, color: '#fff', flex: 1 }}>{fullWord(id, s.active)}</Txt>
                    <Txt v="caption" color="rgba(255,255,255,0.6)">{labelOf(id, s.native)?.word}</Txt>
                  </Pressable>
                </Animated.View>
              );
            })}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Button title={t('common.cancel')} variant="secondary" size="m" style={{ flex: 1 }} onPress={() => setScene(null)} />
              <Button
                title={t('camera.saveSelected', { n: sceneSel.length })}
                variant="inverse"
                size="m"
                disabled={!sceneSel.length}
                style={{ flex: 2 }}
                onPress={() => {
                  sceneSel.forEach((id) => useApp.getState().saveWord(id, scene.photo, 'camera'));
                  haptic.success();
                  toast(t('word.savedToast'));
                  setScene(null);
                }}
              />
            </View>
          </View>
        </Animated.View>
      )}

      {/* top bar */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => setLangOpen(true)} style={styles.pill}>
          <Txt v="captionMedium" color="#fff">{languageName(s.native, s.uiLang)} → {languageName(s.active, s.uiLang)}</Txt>
          <ChevronDown size={14} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }} />
        {status === 'loading' && camAvailable && (
          <View style={styles.pill}>
            <ActivityIndicator size="small" color="#fff" />
            <Txt v="caption" color="#fff">{t('camera.loadingModel')}</Txt>
          </View>
        )}
        {camAvailable && (
          <Pressable onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} style={[styles.pill, { width: 34, paddingHorizontal: 0, justifyContent: 'center' }]} accessibilityLabel={t('camera.flip')}>
            <SwitchCamera size={16} color="#fff" />
          </Pressable>
        )}
      </View>

      {!dropDone && (
        <Animated.View entering={FadeInDown.delay(400).springify()} style={{ position: 'absolute', top: insets.top + 56, left: 16, right: 16, alignItems: 'center' }}>
          <Pressable onPress={() => router.push('/drop')} style={styles.dropBanner}>
            <View style={styles.dropDot} />
            <View>
              <Txt v="captionMedium" color="#fff">{t('camera.dropBanner', { word: fullWord(todayDrop, s.active) })}</Txt>
              <Txt v="caption" color="rgba(255,255,255,0.7)" style={{ fontSize: 11 }}>{t('camera.dropBannerSub')}</Txt>
            </View>
          </Pressable>
        </Animated.View>
      )}

      {/* bottom controls */}
      <View style={[styles.bottom, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom * 0.3 }]} pointerEvents="box-none">
        {camAvailable && !scene && (
          <>
            <Txt v="caption" color="rgba(255,255,255,0.8)" center style={{ marginBottom: 12, paddingHorizontal: 24 }}>{hint}</Txt>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Pressable onPress={shoot} style={styles.shutter} accessibilityLabel={t('camera.capture')}>
                {busy ? <ActivityIndicator color="#141414" /> : <View style={[styles.shutterInner, mode === 'scene' && { borderRadius: 14, width: 44, height: 44 }]} />}
              </Pressable>
            </View>
          </>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 14 }}>
          {MODES.map((m) => {
            const sel = m === mode;
            return (
              <Pressable key={m} onPress={() => onMode(m)} style={[styles.mode, sel && { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                {m === 'gallery' && <ImageIcon size={13} color="rgba(255,255,255,0.8)" />}
                {m === 'drop' && <View style={[styles.dropDot, { width: 6, height: 6 }]} />}
                <Txt v="captionMedium" color={sel ? '#fff' : 'rgba(255,255,255,0.65)'}>{t(`camera.modes.${m}`)}</Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      {busy && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.busy}>
          <Txt v="captionMedium" color="#fff">{t('camera.recognising')}</Txt>
        </Animated.View>
      )}

      <WordPeek
        visible={peekOpen}
        conceptId={found?.concept ?? null}
        photo={found?.photo}
        alternatives={found?.alternatives}
        confidence={found?.confidence}
        source="camera"
        onClose={() => setPeekOpen(false)}
        onShare={() => {
          setPeekOpen(false);
          openComposer(router as never, { photo: found?.photo, concept: found?.concept ?? undefined });
        }}
        onChange={(id) => {
          if (id === '__pick__') {
            setPeekOpen(false);
            setTimeout(() => setPickerFor(found?.photo), 250);
          } else setFound((f) => (f ? { ...f, concept: id, confidence: 1 } : f));
        }}
      />
      <ConceptPicker
        visible={pickerFor !== null}
        photo={pickerFor ?? undefined}
        onClose={() => setPickerFor(null)}
        onPick={(id) => {
          const photo = pickerFor ?? undefined;
          setPickerFor(null);
          setTimeout(() => showPeek({ concept: id, photo, alternatives: [], confidence: 1 }), 250);
        }}
      />
      <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />
    </View>
  );
}

function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const s = useApp((x) => x.settings);
  const addTarget = useApp((x) => x.addTarget);
  return (
    <Sheet visible={visible} onClose={onClose} title={t('settings.learning')}>
      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        {LANGUAGES.filter((l) => l.code !== s.native).map((l) => {
          const active = l.code === s.active;
          return (
            <Pressable key={l.code} onPress={() => { addTarget(l.code); haptic.light(); onClose(); }} style={[styles.langRow, { backgroundColor: active ? c.text : c.surfaceAlt }]}>
              <Txt v="bodyMedium" color={active ? c.background : c.text} style={{ flex: 1 }}>{l.native}</Txt>
              <Txt style={{ fontFamily: fonts.serif, fontSize: 18, color: active ? c.background : c.textSecondary }}>{fullWord('window', l.code)}</Txt>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  gradTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  gradBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 300 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.38)', paddingHorizontal: 12, height: 34, borderRadius: 999 },
  dropBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(14,14,14,0.6)', borderColor: 'rgba(255,107,53,0.6)', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  dropDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B35' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 32, borderRadius: 999 },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  busy: { position: 'absolute', alignSelf: 'center', top: '45%', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  sceneCard: { backgroundColor: 'rgba(14,14,14,0.86)', borderRadius: radius.l, padding: 16, width: '100%', maxWidth: 420 },
  sceneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  langRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 50, borderRadius: radius.s },
});
