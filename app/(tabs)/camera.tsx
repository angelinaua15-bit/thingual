import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, View, useWindowDimensions, ImageStyle, StyleProp } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { Check, ChevronDown, ImageIcon, Sparkles, Zap } from 'lucide-react-native';
import { Txt, Button } from '../../src/components/ui';
import { Photo } from '../../src/components/Photo';
import { WordPeek, ConceptPicker } from '../../src/components/WordPeek';
import { Sheet, toast } from '../../src/components/Overlay';
import { useTheme, fonts, radius, TAB_BAR_HEIGHT } from '../../src/theme/tokens';
import { useT, languageName } from '../../src/i18n';
import { useApp, FREE_LIMITS, usageNow } from '../../src/store/useApp';
import { recognize, Recognition } from '../../src/lib/recognize';
import { CONCEPTS, fullWord, labelOf } from '../../src/data/concepts';
import { photosFor, unsplash } from '../../src/data/photos';
import { dropFor, dateKey } from '../../src/data/social';
import { haptic } from '../../src/lib/feedback';
import { LANGUAGES } from '../../src/data/languages';

type Mode = 'object' | 'scene' | 'text' | 'gallery' | 'drop';
const MODES: Mode[] = ['object', 'scene', 'text', 'gallery', 'drop'];

const DEMO_OBJECTS = ['teapot', 'bicycle', 'cat', 'lamp', 'coffee', 'shoes', 'umbrella', 'book', 'plant', 'key', 'glasses', 'clock', 'bread', 'chair', 'flower', 'backpack'];
const DEMO_SCENES = [
  { path: 'photo-1496092607007-ca127e0b6a10', objects: ['teapot', 'flower', 'window'] },
  { path: 'photo-1523191339508-68905a77d5e7', objects: ['lamp', 'window'] },
  { path: 'photo-1563693998336-93c10e5d8f91', objects: ['plant', 'window'] },
  { path: 'photo-1509042239860-f550ce710b93', objects: ['coffee', 'cup'] },
];
const MENU = [
  { id: 'coffee', price: '2.50' }, { id: 'bread', price: '1.80' }, { id: 'egg', price: '1.20' },
  { id: 'apple', price: '0.90' }, { id: 'banana', price: '0.70' }, { id: 'teapot', price: '3.40' },
];

export default function CameraScreen() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const s = useApp((x) => x.settings);
  const premium = useApp((x) => x.premium);
  const dropsDone = useApp((x) => x.drops);
  const [perm, requestPerm] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('object');
  const [focused, setFocused] = useState(true);
  const [useDemo, setUseDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<(Recognition & { photo?: string }) | null>(null);
  const [peekOpen, setPeekOpen] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | undefined | null>(null);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [sceneFound, setSceneFound] = useState<string[] | null>(null);
  const [sceneSel, setSceneSel] = useState<string[]>([]);
  const [langOpen, setLangOpen] = useState(false);
  const [demoIdx, setDemoIdx] = useState(0);
  const camRef = useRef<CameraView>(null);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  const hasCamera = !!perm?.granted && !useDemo;
  const todayDrop = dropFor();
  const dropDone = !!dropsDone[dateKey()];
  const left = premium ? null : Math.max(0, FREE_LIMITS.aiScansPerDay - usageNow().aiScans);

  /* ---------- recognition flows ---------- */
  const runRecognition = async (opts: { base64?: string; uri?: string; known?: string }) => {
    if (!useApp.getState().useAiScan()) {
      toast(t('camera.limitTitle'), 'default');
      router.push('/paywall');
      return;
    }
    setBusy(true);
    haptic.light();
    const r = await recognize({ base64: opts.base64, knownConcept: opts.known });
    setBusy(false);
    if (r.concept) {
      setResult({ ...r, photo: opts.uri });
      setPeekOpen(true);
      haptic.success();
    } else {
      setPickerFor(opts.uri);
    }
  };

  const captureReal = async () => {
    try {
      const pic = await camRef.current?.takePictureAsync({ quality: 0.4, base64: true, skipProcessing: true });
      if (!pic) return;
      const uri = Platform.OS === 'web' ? `data:image/jpeg;base64,${pic.base64}` : pic.uri;
      await runRecognition({ base64: pic.base64, uri });
    } catch {
      toast(t('camera.noPermission'), 'default');
    }
  };

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const uri = Platform.OS === 'web' && a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
    await runRecognition({ base64: a.base64 ?? undefined, uri });
  };

  const runScene = async () => {
    if (!useApp.getState().useScene()) {
      router.push('/paywall');
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    setBusy(false);
    const found = DEMO_SCENES[sceneIdx].objects;
    setSceneFound(found);
    setSceneSel(found);
    haptic.success();
  };

  const onMode = (m: Mode) => {
    haptic.light();
    if (m === 'drop') {
      router.push('/drop');
      return;
    }
    if (m === 'gallery') {
      pickFromGallery();
      return;
    }
    setSceneFound(null);
    setMode(m);
  };

  const currentDemoConcept = DEMO_OBJECTS[demoIdx];

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* ---------- Viewfinder ---------- */}
      {mode === 'object' && (hasCamera && focused ? (
        <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <DemoPager width={width} height={height} index={demoIdx} onIndex={setDemoIdx} />
      ))}
      {mode === 'scene' && (
        <View style={StyleSheet.absoluteFill}>
          <Photo uri={unsplash(DEMO_SCENES[sceneIdx].path, 1200)} style={StyleSheet.absoluteFill as StyleProp<ImageStyle>} />
        </View>
      )}
      {mode === 'text' && <MenuBoard />}

      <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 160 }} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 300 }} pointerEvents="none" />

      {/* ---------- Center dot / scene results ---------- */}
      {mode === 'object' && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="box-none">
          <BreathingDot busy={busy} onPress={() => (hasCamera ? captureReal() : runRecognition({ known: currentDemoConcept, uri: unsplash(photosFor(currentDemoConcept)[0].path, 900) }))} />
        </View>
      )}
      {mode === 'scene' && sceneFound && (
        <Animated.View entering={FadeIn} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
          <View style={{ backgroundColor: 'rgba(14,14,14,0.78)', borderRadius: radius.l, padding: 18, width: '100%', maxWidth: 420 }}>
            <Txt v="overline" color="rgba(255,255,255,0.6)" style={{ marginBottom: 12 }}>{t('camera.sceneFound', { n: sceneFound.length })}</Txt>
            {sceneFound.map((id, i) => {
              const sel = sceneSel.includes(id);
              return (
                <Animated.View key={id} entering={FadeInDown.delay(i * 120)}>
                  <Pressable onPress={() => setSceneSel((x) => (sel ? x.filter((y) => y !== id) : [...x, id]))} style={styles.sceneRow}>
                    <View style={[styles.checkbox, { backgroundColor: sel ? '#fff' : 'transparent' }]}>{sel && <Check size={14} color="#141414" />}</View>
                    <Txt style={{ fontFamily: fonts.serif, fontSize: 24, color: '#fff', flex: 1 }}>{fullWord(id, s.active)}</Txt>
                    <Txt v="caption" color="rgba(255,255,255,0.6)">{labelOf(id, s.native)?.word}</Txt>
                  </Pressable>
                </Animated.View>
              );
            })}
            <Button
              title={t('camera.saveSelected', { n: sceneSel.length })}
              variant="inverse"
              disabled={!sceneSel.length}
              style={{ marginTop: 14 }}
              onPress={() => {
                sceneSel.forEach((id) => useApp.getState().saveWord(id, '', 'camera'));
                haptic.success();
                toast(t('word.savedToast'));
                setSceneFound(null);
                setSceneIdx((i) => (i + 1) % DEMO_SCENES.length);
              }}
            />
          </View>
        </Animated.View>
      )}

      {/* ---------- Top bar ---------- */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => setLangOpen(true)} style={styles.langPill}>
          <Txt v="captionMedium" color="#fff">{languageName(s.native, s.uiLang)} → {languageName(s.active, s.uiLang)}</Txt>
          <ChevronDown size={14} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }} />
        {left !== null && (
          <View style={styles.scans}>
            <Zap size={13} color="#fff" />
            <Txt v="captionMedium" color="#fff">{left}</Txt>
          </View>
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

      {/* ---------- Bottom controls ---------- */}
      <View style={[styles.bottom, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom * 0.3 }]} pointerEvents="box-none">
        <Txt v="caption" color="rgba(255,255,255,0.75)" center style={{ marginBottom: 12, paddingHorizontal: 24 }}>
          {mode === 'object' ? (hasCamera ? t('camera.hint') : t('camera.demoHint')) : mode === 'scene' ? t('camera.sceneHint') : t('camera.textFound')}
        </Txt>
        {mode === 'scene' && !sceneFound && (
          <Animated.View entering={ZoomIn} style={{ alignItems: 'center', marginBottom: 14 }}>
            <Pressable onPress={runScene} style={styles.shutter}>
              {busy ? <Sparkles size={26} color="#141414" /> : <View style={styles.shutterInner} />}
            </Pressable>
            {!premium && <Txt v="caption" color="rgba(255,255,255,0.6)" style={{ marginTop: 8 }}>{t('camera.sceneLimit', { n: FREE_LIMITS.scenesPerWeek })}</Txt>}
          </Animated.View>
        )}
        {mode === 'object' && !hasCamera && (
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            {!perm?.granted ? (
              <Pressable onPress={() => { setUseDemo(false); requestPerm(); }} style={styles.smallBtn}>
                <Txt v="captionMedium" color="#fff">{t('camera.grant')}</Txt>
              </Pressable>
            ) : (
              <Pressable onPress={() => setUseDemo(false)} style={styles.smallBtn}>
                <Txt v="captionMedium" color="#fff">{t('tabs.camera')}</Txt>
              </Pressable>
            )}
          </View>
        )}
        {mode === 'object' && hasCamera && (
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Pressable onPress={() => setUseDemo(true)} style={styles.smallBtn}>
              <Txt v="captionMedium" color="#fff">{t('camera.useDemo')}</Txt>
            </Pressable>
          </View>
        )}
        <ModeBar mode={mode} onChange={onMode} />
      </View>

      {busy && mode !== 'scene' && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.busy}>
          <Txt v="captionMedium" color="#fff">{t('camera.recognising')}</Txt>
        </Animated.View>
      )}

      <WordPeek
        visible={peekOpen}
        conceptId={result?.concept ?? null}
        photo={result?.photo}
        alternatives={result?.alternatives}
        confidence={result?.confidence}
        source="camera"
        onClose={() => setPeekOpen(false)}
        onChange={(id) => {
          if (id === '__pick__') {
            setPeekOpen(false);
            setTimeout(() => setPickerFor(result?.photo), 250);
          } else setResult((r) => (r ? { ...r, concept: id, confidence: 1 } : r));
        }}
      />
      <ConceptPicker
        visible={pickerFor !== null}
        photo={pickerFor ?? undefined}
        onClose={() => setPickerFor(null)}
        onPick={(id) => {
          const photo = pickerFor ?? undefined;
          setPickerFor(null);
          setResult({ concept: id, confidence: 1, alternatives: [], source: 'none', photo });
          setTimeout(() => setPeekOpen(true), 250);
        }}
      />
      <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />
    </View>
  );
}

/* ---------------- Demo pager with real photos ---------------- */
function DemoPager({ width, height, index, onIndex }: { width: number; height: number; index: number; onIndex: (i: number) => void }) {
  return (
    <FlatList
      data={DEMO_OBJECTS}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      keyExtractor={(id) => id}
      initialScrollIndex={index}
      getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      onMomentumScrollEnd={(e) => onIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      onScroll={Platform.OS === 'web' ? (e) => onIndex(Math.round(e.nativeEvent.contentOffset.x / width)) : undefined}
      scrollEventThrottle={64}
      style={StyleSheet.absoluteFill}
      renderItem={({ item }) => (
        <View style={{ width, height }}>
          <Photo uri={unsplash(photosFor(item)[0].path, 1100)} style={{ width, height }} transition={250} />
        </View>
      )}
    />
  );
}

/* ---------------- Breathing dot ---------------- */
function BreathingDot({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  const p = useSharedValue(1);
  useEffect(() => {
    p.value = withRepeat(withSequence(withTiming(1.5, { duration: 1300 }), withTiming(1, { duration: 1300 })), -1);
  }, []);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: p.value }], opacity: 1.6 - p.value * 0.9 }));
  const core = useAnimatedStyle(() => ({ transform: [{ scale: busy ? 0.7 : 1 }] }));
  return (
    <Pressable onPress={onPress} hitSlop={40} accessibilityRole="button" accessibilityLabel="recognise">
      <View style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[styles.ring, ring]} />
        <Animated.View style={[styles.core, core]} />
      </View>
    </Pressable>
  );
}

/* ---------------- Mode bar ---------------- */
function ModeBar({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const { t } = useT();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 14 }}>
      {MODES.map((m) => {
        const sel = m === mode;
        return (
          <Pressable key={m} onPress={() => onChange(m)} style={[styles.mode, sel && { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            {m === 'gallery' && <ImageIcon size={13} color="rgba(255,255,255,0.8)" />}
            {m === 'drop' && <View style={[styles.dropDot, { width: 6, height: 6 }]} />}
            <Txt v="captionMedium" color={sel ? '#fff' : 'rgba(255,255,255,0.65)'}>{t(`camera.modes.${m}`)}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------- Text mode demo: a café menu in the target language ---------------- */
function MenuBoard() {
  const s = useApp((x) => x.settings);
  const [peek, setPeek] = useState<string | null>(null);
  return (
    <View style={StyleSheet.absoluteFill}>
      <Photo uri={unsplash('photo-1511920170033-f8396924c348', 1200)} style={StyleSheet.absoluteFill as StyleProp<ImageStyle>} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }]}>
        <Animated.View entering={FadeInUp.springify()} style={styles.menu}>
          <Txt v="overline" color="#6B6B6B" center style={{ marginBottom: 12 }}>Menu · Café</Txt>
          {MENU.map((m, i) => (
            <Animated.View key={m.id} entering={FadeInDown.delay(150 + i * 70)}>
              <Pressable onPress={() => { haptic.light(); setPeek(m.id); }} style={styles.menuRow}>
                <Txt style={{ fontFamily: fonts.serif, fontSize: 24, color: '#141414', textDecorationLine: 'underline', textDecorationColor: 'rgba(59,91,219,0.35)' }}>{fullWord(m.id, s.active)}</Txt>
                <View style={{ flex: 1, borderBottomWidth: 1, borderStyle: 'dotted', borderColor: '#C9C6BF', marginHorizontal: 8, marginBottom: 6 }} />
                <Txt style={{ fontFamily: fonts.medium, fontSize: 15, color: '#141414' }}>{m.price}</Txt>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>
      </View>
      <WordPeek visible={!!peek} conceptId={peek} onClose={() => setPeek(null)} source="camera" />
    </View>
  );
}

/* ---------------- Language switcher ---------------- */
function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const s = useApp((x) => x.settings);
  const premium = useApp((x) => x.premium);
  const addTarget = useApp((x) => x.addTarget);
  return (
    <Sheet visible={visible} onClose={onClose} title={t('settings.learning')}>
      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        {LANGUAGES.filter((l) => l.code !== s.native).map((l) => {
          const active = l.code === s.active;
          const mine = s.targets.includes(l.code);
          return (
            <Pressable
              key={l.code}
              onPress={() => {
                if (!premium && !mine && s.targets.length >= FREE_LIMITS.targets) {
                  addTarget(l.code);
                } else addTarget(l.code);
                haptic.light();
                onClose();
              }}
              style={[styles.langRow, { backgroundColor: active ? c.text : c.surfaceAlt }]}
            >
              <Txt v="bodyMedium" color={active ? c.background : c.text} style={{ flex: 1 }}>{l.native}</Txt>
              <Txt style={{ fontFamily: fonts.serif, fontSize: 18, color: active ? c.background : c.textSecondary }}>{fullWord('window', l.code)}</Txt>
            </Pressable>
          );
        }).slice(0, 15)}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  langPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 12, height: 34, borderRadius: 999 },
  scans: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 10, height: 30, borderRadius: 999 },
  dropBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(14,14,14,0.6)', borderColor: 'rgba(255,107,53,0.6)', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  dropDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B35' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 32, borderRadius: 999 },
  ring: { position: 'absolute', width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: '#fff' },
  core: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', shadowColor: '#fff', shadowOpacity: 0.9, shadowRadius: 12, elevation: 6 },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  smallBtn: { backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 14, height: 32, borderRadius: 999, justifyContent: 'center' },
  busy: { position: 'absolute', alignSelf: 'center', top: '58%', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  sceneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  menu: { backgroundColor: '#FAF7F0', borderRadius: 18, paddingVertical: 22, paddingHorizontal: 24, width: '82%', maxWidth: 380, transform: [{ rotate: '-2deg' }], shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 24, elevation: 10 },
  menuRow: { flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 6 },
  langRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 50, borderRadius: radius.s },
});
