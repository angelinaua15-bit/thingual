import { BrandBackground } from '../src/components/BrandBackground';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions, Linking } from 'react-native';
import { goBack } from '../src/lib/nav';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Check, RefreshCw, Volume2, X } from '../src/components/icons';
import { Button, Txt, PressableScale } from '../src/components/ui';
import { Photo, photoForWord } from '../src/components/Photo';
import { TimerRing, toast, monoStyle } from '../src/components/Overlay';
import { useTheme, fonts, radius, space, BRAND } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { CONCEPTS, PHYSICAL_TOPICS, fullWord, labelOf } from '../src/data/concepts';
import { recognize, backendConnected } from '../src/lib/recognize';
import { detectUri, detectorSupported } from '../src/lib/detect';
import { haptic, speak } from '../src/lib/feedback';

const DURATION = 60;
/** Things found in most homes — all of them recognisable by the on-device model. */
const HOME_THINGS = ['cup', 'spoon', 'fork', 'book', 'bottle', 'chair', 'phone', 'clock', 'backpack', 'apple', 'bowl', 'laptop', 'keyboard', 'mouse', 'scissors', 'toothbrush', 'vase', 'glass', 'plant', 'banana'];

/** "Find it nearby": we name a word — 60 seconds to find and photograph the object. */
export default function Find() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = useApp((x) => x.settings);
  const saveWord = useApp((x) => x.saveWord);
  const answer = useApp((x) => x.answer);
  const [perm, request] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [round, setRound] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const [state, setState] = useState<'play' | 'won' | 'lost'>('play');
  const [shot, setShot] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const target = useMemo(() => HOME_THINGS[Math.floor(Math.random() * HOME_THINGS.length)], [round]);
  const choices = useMemo(() => [target, ...CONCEPTS.filter((x) => x.id !== target && PHYSICAL_TOPICS.includes(x.topic)).sort(() => Math.random() - 0.5).slice(0, 5).map((x) => x.id)].sort(() => Math.random() - 0.5), [target]);
  const l = labelOf(target, s.active)!;

  useEffect(() => {
    setLeft(DURATION);
    setState('play');
    setShot(null);
    speak(l.word, s.active);
    const id = setInterval(() => setLeft((v) => (v <= 1 ? (clearInterval(id), 0) : v - 1)), 1000);
    return () => clearInterval(id);
  }, [round]);

  useEffect(() => {
    if (left === 0 && state === 'play') {
      setState('lost');
      haptic.error();
    }
  }, [left]);

  const win = (photo?: string) => {
    setState('won');
    setScore((n) => n + 1);
    saveWord(target, photo ?? '', 'find');
    answer(target, 'good');
    haptic.success();
  };

  const capture = async () => {
    try {
      const pic = await camRef.current?.takePictureAsync({ quality: 0.4, base64: true });
      if (!pic) return;
      const uri = Platform.OS === 'web' ? `data:image/jpeg;base64,${pic.base64}` : pic.uri;
      setShot(uri);
      const dets = await detectUri(uri);
      if (dets.some((d) => d.concept === target)) return win(uri);
      if (detectorSupported && !backendConnected()) {
        toast(t('camera.nothingFound'), 'default');
        setShot(null);
        return;
      }
      if (backendConnected()) {
        const r = await recognize({ base64: pic.base64 });
        if (r.concept === target || r.alternatives.includes(target)) return win(uri);
        toast(t('camera.somethingElse'), 'default');
        setShot(null); // back to the live camera so the user can try again
      }
    } catch {
      setShot(null);
      toast(t('camera.noPermission'), 'default');
    }
  };

  const tile = (Math.min(width, 520) - space.m * 2 - 16) / 3;

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.deep, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <BrandBackground />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52 }}>
        <Pressable onPress={() => goBack()} hitSlop={12}><X size={22} color="#fff" /></Pressable>
        <View style={{ flex: 1 }} />
        <Txt v="captionMedium" color="rgba(255,255,255,0.7)">✓ {score}</Txt>
      </View>

      <Animated.View key={round} entering={FadeInDown} style={{ alignItems: 'center', paddingHorizontal: space.l }}>
        <Txt v="overline" color="#FF8A5B">{t('learn.ex.find')}</Txt>
        <Pressable onPress={() => speak(l.word, s.active)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <Txt style={{ fontFamily: fonts.serif, fontSize: 48, color: '#fff' }}>{fullWord(target, s.active)}</Txt>
          <Volume2 size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>
        <View style={{ marginTop: 10 }}>
          <TimerRing size={70} progress={left / DURATION} color={left > 15 ? '#FFFFFF' : '#FF6B35'}>
            <Txt style={[{ color: '#fff', fontSize: 18 }, monoStyle]}>{left}</Txt>
          </TimerRing>
        </View>
      </Animated.View>

      <View style={{ flex: 1, padding: space.m, alignItems: 'center', justifyContent: 'center' }}>
        {state !== 'play' ? (
          <Animated.View entering={ZoomIn.springify()} style={{ alignItems: 'center', gap: 14 }}>
            <View style={{ width: 200, height: 250, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 3, borderColor: state === 'won' ? '#51CF66' : '#FF6B6B' }}>
              <Photo uri={shot ?? photoForWord(target, undefined, 500)} style={{ width: '100%', height: '100%' }} />
            </View>
            <Txt v="headline" color="#fff">{state === 'won' ? t('learn.correct') : t('learn.timeUp')}</Txt>
            <Txt v="callout" color="rgba(255,255,255,0.6)">{labelOf(target, s.native)?.word}</Txt>
            <Button title={t('common.next')} variant="inverse" icon={<RefreshCw size={16} color="#141414" />} onPress={() => setRound((r) => r + 1)} style={{ minWidth: 220 }} />
          </Animated.View>
        ) : perm?.granted ? (
          <View style={{ width: '100%', maxWidth: 480, flex: 1, borderRadius: radius.xl, overflow: 'hidden' }}>
            {shot ? <Photo uri={shot} style={StyleSheet.absoluteFill as never} /> : <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing="back" />}
            <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16, gap: 10, alignItems: 'center' }}>
              {!shot ? (
                <Pressable onPress={capture} style={styles.shutter}><View style={styles.shutterInner} /></Pressable>
              ) : !backendConnected() && !detectorSupported ? (
                <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
                  <Button title={t('drop.retake')} variant="secondary" size="m" style={{ flex: 1 }} onPress={() => setShot(null)} />
                  <Button title={t('learn.found')} variant="inverse" size="m" icon={<Check size={16} color="#141414" />} style={{ flex: 1 }} onPress={() => win(shot)} />
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <Animated.View entering={FadeIn} style={{ alignItems: 'center', width: '100%', maxWidth: 520 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {choices.map((id) => (
                <PressableScale key={id} onPress={() => (id === target ? win() : (haptic.error(), toast(labelOf(id, s.active)?.word ?? '', 'default')))} style={{ width: tile, height: tile * 1.2, borderRadius: radius.m, overflow: 'hidden' }}>
                  <Photo uri={photoForWord(id, undefined, 300)} style={{ width: '100%', height: '100%' }} />
                </PressableScale>
              ))}
            </View>
            <Pressable onPress={() => (Platform.OS !== 'web' && perm && !perm.canAskAgain ? Linking.openSettings() : request())} style={{ marginTop: 18 }}>
              <Txt v="captionMedium" color="rgba(255,255,255,0.7)">{t('camera.grant')}</Txt>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
});
