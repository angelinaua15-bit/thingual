import { Logo } from '../src/components/Logo';
import { BrandBackground } from '../src/components/BrandBackground';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, ImageStyle, StyleProp } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing, FadeIn, FadeInDown, FadeInUp, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming, withDelay, withSequence, withSpring,
} from 'react-native-reanimated';
import { Camera, Check, ChevronLeft, Volume2, X } from '../src/components/icons';
import { Button, PressableScale, Txt, ProgressBar, Avatar } from '../src/components/ui';
import { TextInput } from 'react-native';
import { pickImage } from '../src/lib/pickImage';
import { normalizeHandle } from '../src/lib/api';
import { Photo } from '../src/components/Photo';
import { useTheme, fonts, radius, space, BRAND } from '../src/theme/tokens';
import { useApp, Goal, Level } from '../src/store/useApp';
import { translate, translateArr, languageName } from '../src/i18n';
import { LANGUAGES, LangCode, UI_LANGUAGES } from '../src/data/languages';
import { CONCEPTS, fullWord, labelOf } from '../src/data/concepts';
import { PHOTOS, SCENES, unsplash, photosFor } from '../src/data/photos';
import { CEFR_ORDER, bucketOf, cefrFromQuiz } from '../src/lib/level';
import type { CEFR } from '../src/data/words/types';
import { haptic, speak } from '../src/lib/feedback';

type Step = 'welcome' | 'native' | 'target' | 'goal' | 'quizIntro' | 'quiz' | 'result' | 'camera' | 'profile' | 'ready';
const ORDER: Step[] = ['welcome', 'native', 'target', 'goal', 'quizIntro', 'quiz', 'result', 'camera', 'profile', 'ready'];

const QUIZ_CONCEPTS = ['coffee', 'apple', 'window', 'key', 'umbrella', 'mirror'];

export default function Onboarding() {
  const store = useApp();
  const [step, setStep] = useState<Step>('welcome');
  const [native, setNative] = useState<LangCode>(store.settings.native);
  const [target, setTarget] = useState<LangCode>(store.settings.active === store.settings.native ? 'en' : store.settings.active);
  const [goal, setGoal] = useState<Goal | undefined>();
  const [answers, setAnswers] = useState<boolean[]>([]);
  const ui = UI_LANGUAGES.includes(native) ? native : 'en';
  const t = (k: string, v?: Record<string, string | number>) => translate(ui, k, v);
  const ta = (k: string) => translateArr(ui, k);

  const go = (s: Step) => {
    haptic.light();
    setStep(s);
  };
  const back = () => {
    const i = ORDER.indexOf(step);
    if (i > 0 && step !== 'result' && step !== 'quiz') setStep(ORDER[i - 1]);
  };

  const score = answers.filter(Boolean).length;
  const [cefrPick, setCefrPick] = useState<CEFR | null>(null);
  const cefr: CEFR = cefrPick ?? cefrFromQuiz(score, QUIZ_CONCEPTS.length);
  const level: Level = bucketOf(cefr);

  const finish = () => {
    const missed = QUIZ_CONCEPTS.filter((_, i) => !answers[i]);
    store.completeOnboarding({ goal, level, cefr, native, target, quizScore: score, quizWords: missed });
    router.replace('/(tabs)/camera');
  };

  const progressIdx = ORDER.indexOf(step);

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.deep }}>
      <BrandBackground />
      {step === 'welcome' && <Welcome t={t} onStart={() => go('native')} />}
      {step !== 'welcome' && (
        <Frame
          onBack={['native', 'target', 'goal', 'quizIntro', 'camera', 'profile'].includes(step) ? back : undefined}
          progress={progressIdx / (ORDER.length - 1)}
          dark={step === 'quiz' || step === 'camera' || step === 'quizIntro'}
        >
          {step === 'native' && (
            <LanguagePicker
              key="native"
              title={t('onboarding.nativeTitle')}
              value={native}
              onChange={(l) => { setNative(l); if (l === target) setTarget(l === 'en' ? 'es' : 'en'); }}
              onNext={() => go('target')}
              cta={t('common.continue')}
            />
          )}
          {step === 'target' && (
            <LanguagePicker
              key="target"
              title={t('onboarding.targetTitle')}
              value={target}
              exclude={native}
              onChange={setTarget}
              onNext={() => go('goal')}
              cta={t('common.continue')}
              showSample
            />
          )}
          {step === 'goal' && <GoalPicker t={t} value={goal} onChange={setGoal} onNext={() => go('quizIntro')} />}
          {step === 'quizIntro' && <QuizIntro t={t} target={target} ui={ui} onStart={() => go('quiz')} />}
          {step === 'quiz' && (
            <Quiz
              t={t}
              ta={ta}
              target={target}
              ui={ui}
              onDone={(a) => { setAnswers(a); go('result'); }}
            />
          )}
          {step === 'result' && <Result t={t} score={score} cefr={cefr} onPick={setCefrPick} missed={QUIZ_CONCEPTS.filter((_, i) => !answers[i])} target={target} onNext={() => go('camera')} />}
          {step === 'camera' && <CameraStep t={t} target={target} native={native} onNext={() => go('profile')} />}
          {step === 'profile' && <ProfileStep t={t} onNext={() => go('ready')} />}
          {step === 'ready' && <Ready t={t} onDone={finish} />}
        </Frame>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Frame with progress + back                                          */
/* ------------------------------------------------------------------ */
function Frame({ children, onBack, progress, dark }: { children: React.ReactNode; onBack?: () => void; progress: number; dark?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const bg = dark ? '#0A1D30' : c.background;
  const fg = dark ? '#FFFFFF' : c.text;
  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      {dark && <BrandBackground />}
      <View style={styles.topBar}>
        <Pressable onPress={onBack} disabled={!onBack} hitSlop={12} style={{ width: 32, opacity: onBack ? 1 : 0 }}>
          <ChevronLeft size={24} color={fg} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={progress} color={dark ? '#FFFFFF' : c.text} track={dark ? 'rgba(255,255,255,0.18)' : c.divider} height={3} />
        </View>
        <View style={{ width: 32 }} />
      </View>
      <View style={{ flex: 1, paddingBottom: insets.bottom }}>{children}</View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Welcome: three columns of real photos drifting, words in many langs */
/* ------------------------------------------------------------------ */
function Marquee({ items, speed, reverse, width }: { items: { uri: string; word: string; lang: string }[]; speed: number; reverse?: boolean; width: number }) {
  const tileH = width * 1.3;
  const total = (tileH + 10) * items.length;
  const y = useSharedValue(reverse ? -total : 0);
  useEffect(() => {
    y.value = withRepeat(withTiming(reverse ? 0 : -total, { duration: speed, easing: Easing.linear }), -1, false);
  }, [total]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const doubled = [...items, ...items];
  return (
    <Animated.View style={[{ width, gap: 10 }, a]}>
      {doubled.map((it, i) => (
        <View key={i} style={{ width, height: tileH, borderRadius: 18, overflow: 'hidden' }}>
          <Photo uri={it.uri} style={StyleSheet.absoluteFill as StyleProp<ImageStyle>} transition={600} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={[StyleSheet.absoluteFill, { top: '50%' }]} />
          <View style={{ position: 'absolute', left: 10, bottom: 8, right: 10 }}>
            <Txt numberOfLines={1} style={{ fontFamily: fonts.serif, fontSize: 20, color: '#fff' }}>{it.word}</Txt>
            <Txt v="overline" color="rgba(255,255,255,0.7)" style={{ fontSize: 9 }}>{it.lang}</Txt>
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

function Welcome({ t, onStart }: { t: (k: string) => string; onStart: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const w = Math.min(width, 520);
  const colW = (w - 40) / 3;
  const cols = useMemo(() => {
    const langs: LangCode[] = ['ja', 'es', 'uk', 'de', 'fr', 'ko', 'it', 'pt', 'zh', 'pl', 'tr', 'ar', 'hi', 'vi', 'id', 'en'];
    const ids = ['window', 'coffee', 'bicycle', 'bread', 'cat', 'flower', 'door', 'lamp', 'umbrella', 'teapot', 'tree', 'shoes', 'book', 'dog', 'apple', 'chair', 'bench', 'glasses'];
    const items = ids.map((id, i) => {
      const p = photosFor(id)[0];
      const l = langs[i % langs.length];
      return { uri: unsplash(p.path, 400), word: fullWord(id, l), lang: LANGUAGES.find((x) => x.code === l)!.native };
    });
    return [items.slice(0, 6), items.slice(6, 12), items.slice(12, 18)];
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: BRAND.deep, overflow: 'hidden' }}>
      <BrandBackground />
      <View style={{ position: 'absolute', top: -40, left: (width - w) / 2 + 10, flexDirection: 'row', gap: 10, transform: [{ rotate: '-6deg' }], height: height + 200 }}>
        <Marquee items={cols[0]} speed={60000} width={colW} />
        <View style={{ marginTop: -colW * 0.6 }}>
          <Marquee items={cols[1]} speed={70000} reverse width={colW} />
        </View>
        <Marquee items={cols[2]} speed={55000} width={colW} />
      </View>
      <LinearGradient
        colors={['rgba(10,29,48,0)', 'rgba(10,29,48,0.65)', '#0A1D30']}
        locations={[0, 0.3, 0.5]}
        style={[StyleSheet.absoluteFill, { top: height * 0.15 }]}
      />
      <View style={{ position: 'absolute', left: 24, right: 24, bottom: insets.bottom + 24, maxWidth: 520, alignSelf: 'center', width: Math.min(width - 48, 520) }}>
        <Animated.View entering={FadeInDown.delay(150).duration(700)}>
          <View style={{ marginBottom: 18 }}><Logo size={34} /></View>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(300).duration(800)}>
          <Txt style={{ fontFamily: fonts.serif, fontSize: 58, lineHeight: 58, color: '#fff', letterSpacing: -1 }}>{t('onboarding.welcomeTitle')}</Txt>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(500).duration(800)}>
          <Txt v="body" color="rgba(255,255,255,0.75)" style={{ marginTop: 16, marginBottom: 28 }}>{t('onboarding.welcomeSub')}</Txt>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(750).duration(700)}>
          <Button title={t('onboarding.start')} variant="inverse" onPress={onStart} />
          <Txt v="caption" color="rgba(255,255,255,0.5)" center style={{ marginTop: 14 }}>{t('onboarding.noSignup')}</Txt>
          <Pressable onPress={() => router.push('/signin')} hitSlop={8} style={{ alignSelf: 'center', marginTop: 10 }}>
            <Txt v="captionMedium" color="rgba(255,255,255,0.85)" style={{ textDecorationLine: 'underline' }}>{t('sync.haveAccount')}</Txt>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Language picker                                                      */
/* ------------------------------------------------------------------ */
function LanguagePicker({ title, value, onChange, onNext, cta, exclude, showSample }: {
  title: string; value: LangCode; onChange: (l: LangCode) => void; onNext: () => void; cta: string; exclude?: LangCode; showSample?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.l, paddingBottom: 120, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <Txt v="display" style={{ marginBottom: space.l }}>{title}</Txt>
        </Animated.View>
        <View style={{ gap: 8 }}>
          {LANGUAGES.filter((l) => l.code !== exclude).map((l, i) => {
            const sel = l.code === value;
            return (
              <Animated.View key={l.code} entering={FadeInDown.delay(60 + i * 25).duration(400)}>
                <PressableScale
                  onPress={() => onChange(l.code)}
                  style={[styles.langRow, { backgroundColor: sel ? c.text : c.surface, borderColor: sel ? c.text : c.divider }]}
                >
                  <Txt v="bodyMedium" color={sel ? c.background : c.text} style={{ flex: 1 }}>{l.native}</Txt>
                  {showSample ? (
                    <Txt style={{ fontFamily: fonts.serif, fontSize: 20, color: sel ? c.background : c.textSecondary }}>{labelOf('window', l.code)?.word}</Txt>
                  ) : null}
                  {sel && <Check size={18} color={c.background} />}
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
      <BottomCta title={cta} onPress={onNext} />
    </View>
  );
}

function BottomCta({ title, onPress, disabled, dark }: { title: string; onPress: () => void; disabled?: boolean; dark?: boolean }) {
  const { c } = useTheme();
  const bg = dark ? '#0A1D30' : c.background;
  return (
    <View style={styles.bottomCta}>
      <LinearGradient colors={[`${bg}00`, bg]} style={{ height: 32 }} />
      <View style={{ backgroundColor: bg, paddingHorizontal: space.l, paddingBottom: space.m }}>
        <View style={{ maxWidth: 512, width: '100%', alignSelf: 'center' }}>
          <Button title={title} onPress={onPress} disabled={disabled} variant={dark ? 'inverse' : 'primary'} />
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Goal                                                                 */
/* ------------------------------------------------------------------ */
function GoalPicker({ t, value, onChange, onNext }: { t: (k: string) => string; value?: Goal; onChange: (g: Goal) => void; onNext: () => void }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const cardW = (Math.min(width, 560) - space.l * 2 - 12) / 2;
  const goals: { id: Goal; photo: string }[] = [
    { id: 'move', photo: SCENES.roomGdansk },
    { id: 'travel', photo: SCENES.travelLake },
    { id: 'study', photo: unsplash('photo-1543002588-bfa74002ed7e', 600) },
    { id: 'curious', photo: SCENES.streetNY },
  ];
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.l, paddingBottom: 120, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <Txt v="display" style={{ marginBottom: space.l }}>{t('onboarding.goalTitle')}</Txt>
        </Animated.View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {goals.map((g, i) => {
            const sel = value === g.id;
            return (
              <Animated.View key={g.id} entering={FadeInDown.delay(100 + i * 80).duration(500)}>
                <PressableScale onPress={() => onChange(g.id)} style={{ width: cardW, height: cardW * 1.35, borderRadius: radius.l, overflow: 'hidden', borderWidth: 3, borderColor: sel ? c.accent : 'transparent' }}>
                  <Photo uri={g.photo} style={StyleSheet.absoluteFill as StyleProp<ImageStyle>} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={[StyleSheet.absoluteFill, { top: '35%' }]} />
                  <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
                    <Txt v="bodyMedium" color="#fff">{t(`goals.${g.id}`)}</Txt>
                    <Txt v="caption" color="rgba(255,255,255,0.75)">{t(`goals.${g.id}Sub`)}</Txt>
                  </View>
                  {sel && (
                    <Animated.View entering={ZoomIn.springify()} style={styles.check}>
                      <Check size={16} color="#fff" />
                    </Animated.View>
                  )}
                </PressableScale>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
      <BottomCta title={t('common.continue')} onPress={onNext} disabled={!value} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Quiz intro: fanned stack of photos                                   */
/* ------------------------------------------------------------------ */
function QuizIntro({ t, target, ui, onStart }: { t: (k: string, v?: Record<string, string | number>) => string; target: LangCode; ui: LangCode; onStart: () => void }) {
  const cards = QUIZ_CONCEPTS.slice(0, 3).map((id) => photosFor(id)[0]);
  const rot = [-10, 4, -2];
  const tx = [-60, 50, 0];
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={{ height: 340, alignItems: 'center', justifyContent: 'center', marginTop: 20 }}>
        {cards.map((p, i) => (
          <Animated.View
            key={p.id}
            entering={FadeInDown.delay(150 + i * 140).springify().damping(14)}
            style={{ position: 'absolute', transform: [{ translateX: tx[i] }, { rotate: `${rot[i]}deg` }] }}
          >
            <View style={{ width: 190, height: 250, borderRadius: 22, overflow: 'hidden', borderWidth: 4, borderColor: '#fff' }}>
              <Photo uri={unsplash(p.path, 500)} style={{ width: '100%', height: '100%' }} />
            </View>
          </Animated.View>
        ))}
      </View>
      <View style={{ padding: space.l, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={FadeInDown.delay(500).duration(600)}>
          <Txt v="display" color="#fff">{t('onboarding.quizIntroTitle')}</Txt>
          <Txt v="body" color="rgba(255,255,255,0.7)" style={{ marginTop: 12, marginBottom: 24 }}>{t('onboarding.quizIntroSub')}</Txt>
          <Txt v="overline" color="rgba(255,255,255,0.5)" style={{ marginBottom: 12 }}>{languageName(target, ui)}</Txt>
          <Button title={t('onboarding.quizStart')} variant="inverse" onPress={onStart} />
        </Animated.View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Quiz                                                                 */
/* ------------------------------------------------------------------ */
function KenBurns({ uri, k }: { uri: string; k: string }) {
  const s = useSharedValue(1.12);
  useEffect(() => {
    s.value = 1.12;
    s.value = withTiming(1, { duration: 7000, easing: Easing.out(Easing.quad) });
  }, [k]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, a]}>
      <Photo uri={uri} style={{ width: '100%', height: '100%' }} transition={400} />
    </Animated.View>
  );
}

function Quiz({ t, ta, target, ui, onDone }: { t: (k: string, v?: Record<string, string | number>) => string; ta: (k: string) => string[]; target: LangCode; ui: LangCode; onDone: (a: boolean[]) => void }) {
  const { width, height } = useWindowDimensions();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const id = QUIZ_CONCEPTS[i];
  const photo = useMemo(() => photosFor(id).find((p) => p.place) ?? photosFor(id)[0], [id]);
  const options = useMemo(() => {
    const others = CONCEPTS.filter((c) => c.id !== id).sort(() => Math.random() - 0.5).slice(0, 3).map((c) => c.id);
    return [...others, id].sort(() => Math.random() - 0.5);
  }, [id]);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const feedback = useMemo(() => {
    const arr = picked === id ? ta('onboarding.right') : ta('onboarding.wrong');
    return arr[(i + (picked?.length ?? 0)) % arr.length];
  }, [picked]);

  const pick = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const ok = opt === id;
    if (ok) haptic.success();
    else {
      haptic.error();
      shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(-6, { duration: 50 }), withTiming(0, { duration: 50 }));
    }
    speak(labelOf(id, target)!.word, target);
    setAnswers((a) => [...a, ok]);
  };

  const next = () => {
    if (i + 1 >= QUIZ_CONCEPTS.length) onDone(answers);
    else {
      setPicked(null);
      setI(i + 1);
    }
  };

  const photoH = Math.min(height * 0.42, 420);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: space.l, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <Txt v="overline" color="rgba(255,255,255,0.5)">{t('onboarding.quizOf', { n: i + 1, total: QUIZ_CONCEPTS.length })}</Txt>
        <Txt v="headline" color="#fff" style={{ marginTop: 6, marginBottom: 14 }}>{t('onboarding.quizQ', { lang: languageName(target, ui) })}</Txt>
      </View>
      <Animated.View key={id} entering={FadeIn.duration(450)} style={{ marginHorizontal: space.l, height: photoH, borderRadius: radius.xl, overflow: 'hidden', maxWidth: 512, width: Math.min(width - 48, 512), alignSelf: 'center' }}>
        <KenBurns uri={unsplash(photo.path, 900)} k={id} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={[StyleSheet.absoluteFill, { top: '60%' }]} />
        {photo.place ? (
          <View style={{ position: 'absolute', left: 14, bottom: 12, right: 14 }}>
            <Txt v="caption" color="rgba(255,255,255,0.85)">{t('onboarding.photoFrom', { place: photo.place })}</Txt>
            <Txt v="caption" color="rgba(255,255,255,0.55)" style={{ fontSize: 11 }}>{photo.author} / Unsplash</Txt>
          </View>
        ) : null}
        {picked && (
          <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.verdict, { backgroundColor: picked === id ? '#2F9E44' : '#E03131' }]}>
            {picked === id ? <Check size={22} color="#fff" /> : <X size={22} color="#fff" />}
          </Animated.View>
        )}
      </Animated.View>
      <Animated.View style={[{ padding: space.l, gap: 10, maxWidth: 560, width: '100%', alignSelf: 'center' }, shakeStyle]}>
        {options.map((o, k) => {
          const isRight = o === id;
          const chosen = picked === o;
          const bg = !picked ? 'rgba(255,255,255,0.08)' : isRight ? 'rgba(47,158,68,0.9)' : chosen ? 'rgba(224,49,49,0.85)' : 'rgba(255,255,255,0.05)';
          return (
            <Animated.View key={`${id}-${o}`} entering={FadeInDown.delay(80 + k * 60).duration(350)}>
              <PressableScale onPress={() => pick(o)} style={[styles.option, { backgroundColor: bg }]}>
                <Txt style={{ fontFamily: fonts.serif, fontSize: 24, color: '#fff', flex: 1 }}>{fullWord(o, target)}</Txt>
                {labelOf(o, target)?.roman ? <Txt v="caption" color="rgba(255,255,255,0.6)">{labelOf(o, target)?.roman}</Txt> : null}
              </PressableScale>
            </Animated.View>
          );
        })}
        {picked && (
          <Animated.View entering={FadeInUp.duration(300)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <View style={{ flex: 1 }}>
              <Txt v="bodyMedium" color="#fff">{feedback}</Txt>
              {picked !== id && <Txt v="caption" color="rgba(255,255,255,0.7)">{t('onboarding.itIs', { word: fullWord(id, target) })}</Txt>}
            </View>
            <Pressable onPress={() => speak(labelOf(id, target)!.word, target)} hitSlop={10} style={styles.round}>
              <Volume2 size={18} color="#fff" />
            </Pressable>
            <Button title={t('common.next')} variant="inverse" size="m" onPress={next} />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Result                                                               */
/* ------------------------------------------------------------------ */
function Result({ t, score, cefr, onPick, missed, target, onNext }: { t: (k: string, v?: Record<string, string | number>) => string; score: number; cefr: CEFR; onPick: (l: CEFR) => void; missed: string[]; target: LangCode; onNext: () => void }) {
  const { c } = useTheme();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setShown(Math.min(n, score));
      if (n >= score) clearInterval(id);
    }, 220);
    haptic.success();
    return () => clearInterval(id);
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.l, paddingBottom: 140, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: 'center', marginTop: 24 }}>
          <Txt style={{ fontFamily: fonts.serif, fontSize: 96, lineHeight: 100, color: c.text }}>{shown}<Txt style={{ fontFamily: fonts.serif, fontSize: 48, color: c.textTertiary }}>/{QUIZ_CONCEPTS.length}</Txt></Txt>
          <Txt v="callout" color={c.textSecondary} style={{ marginTop: 8 }}>{t('onboarding.resultSub')}</Txt>
          <Animated.View entering={ZoomIn.delay(score * 220 + 200).springify()} style={{ marginTop: 10, backgroundColor: c.accentSoft, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }}>
            <Txt v="bodyMedium" color={c.accent}>{cefr} · {t(`cefr.${cefr}`)}</Txt>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(score * 220 + 400)} style={{ marginTop: 18, alignItems: 'center' }}>
            <Txt v="caption" color={c.textSecondary} center>{t('onboarding.levelPick')}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 8 }}>
              {CEFR_ORDER.map((l) => (
                <Pressable key={l} onPress={() => { haptic.light(); onPick(l); }} style={{ minWidth: 48, height: 36, paddingHorizontal: 10, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: l === cefr ? c.text : c.surfaceAlt }}>
                  <Txt v="captionMedium" color={l === cefr ? c.background : c.text}>{l}</Txt>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </Animated.View>
        {missed.length > 0 && (
          <Animated.View entering={FadeInDown.delay(600).duration(500)} style={{ marginTop: 40 }}>
            <Txt v="callout" color={c.textSecondary} style={{ marginBottom: 14 }}>{t('onboarding.resultWords')}</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {missed.map((id, i) => (
                <Animated.View key={id} entering={FadeInDown.delay(700 + i * 90)} style={{ width: 120 }}>
                  <View style={{ width: 120, height: 150, borderRadius: radius.m, overflow: 'hidden' }}>
                    <Photo uri={unsplash(photosFor(id)[0].path, 300)} style={{ width: '100%', height: '100%' }} />
                  </View>
                  <Txt style={{ fontFamily: fonts.serif, fontSize: 20, marginTop: 6, color: c.text }} numberOfLines={1}>{fullWord(id, target)}</Txt>
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </ScrollView>
      <BottomCta title={t('common.continue')} onPress={onNext} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Camera permission                                                    */
/* ------------------------------------------------------------------ */
function CameraStep({ t, onNext, target, native }: { t: (k: string) => string; onNext: () => void; target: LangCode; native: LangCode }) {
  const [, request] = useCameraPermissions();
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1.35, { duration: 1100 }), withTiming(1, { duration: 1100 })), -1);
  }, []);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }], opacity: 2 - pulse.value * 1.2 }));
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, margin: space.l, borderRadius: radius.xl, overflow: 'hidden', maxWidth: 512, width: '100%', alignSelf: 'center' }}>
        <Photo uri={unsplash('photo-1496092607007-ca127e0b6a10', 900)} style={StyleSheet.absoluteFill as StyleProp<ImageStyle>} />
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Animated.View style={[styles.dotRing, ring]} />
          <View style={styles.dot} />
          <Animated.View entering={FadeInUp.delay(600)} style={styles.bubble}>
            <Txt style={{ fontFamily: fonts.serif, fontSize: 22, color: '#141414' }}>{fullWord('teapot', target)}</Txt>
            <Txt v="caption" color="#6B6B6B">{labelOf('teapot', native)?.word}</Txt>
          </Animated.View>
        </View>
        {['tl', 'tr', 'bl', 'br'].map((k) => (
          <View key={k} style={[styles.corner, k.includes('t') ? { top: 18 } : { bottom: 18 }, k.includes('l') ? { left: 18 } : { right: 18 }, {
            borderTopWidth: k.includes('t') ? 3 : 0, borderBottomWidth: k.includes('b') ? 3 : 0, borderLeftWidth: k.includes('l') ? 3 : 0, borderRightWidth: k.includes('r') ? 3 : 0,
          }]} />
        ))}
      </View>
      <View style={{ paddingHorizontal: space.l, paddingBottom: space.m, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <Txt v="title" color="#fff">{t('onboarding.cameraTitle')}</Txt>
        <Txt v="callout" color="rgba(255,255,255,0.7)" style={{ marginTop: 8, marginBottom: 20 }}>{t('onboarding.cameraSub')}</Txt>
        <Button
          title={t('onboarding.allowCamera')}
          variant="inverse"
          icon={<Camera size={18} color="#141414" />}
          onPress={async () => {
            try { await request(); } catch {}
            onNext();
          }}
        />
        <Pressable onPress={onNext} style={{ alignItems: 'center', padding: 14 }}>
          <Txt v="bodyMedium" color="rgba(255,255,255,0.6)">{t('onboarding.later')}</Txt>
        </Pressable>
      </View>
    </View>
  );
}

function ProfileStep({ t, onNext }: { t: (k: string) => string; onNext: () => void }) {
  const { c } = useTheme();
  const nick = useApp((x) => x.profile.nickname);
  const id = useApp((x) => x.profile.id);
  const setLocal = useApp((x) => x.setLocalProfile);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState(normalizeHandle(nick));
  const [avatar, setAvatar] = useState<string | undefined>();
  const save = () => {
    const h = normalizeHandle(handle || name || nick);
    setLocal({ nickname: h.length >= 3 ? h : nick, displayName: name.trim() || undefined, pendingAvatar: avatar });
    onNext();
  };
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.l, paddingBottom: 140, maxWidth: 560, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(500)}>
          <Txt v="display">{t('onboarding.profileTitle')}</Txt>
          <Txt v="body" color={c.textSecondary} style={{ marginTop: 10 }}>{t('onboarding.profileSub')}</Txt>
        </Animated.View>
        <Animated.View entering={ZoomIn.delay(150).springify()} style={{ alignItems: 'center', marginVertical: 28 }}>
          <Pressable onPress={async () => { const u = await pickImage({ square: true, max: 600 }); if (u) setAvatar(u); }}>
            <Avatar seed={id} size={120} label={name || handle} uri={avatar} />
            <View style={[styles.camBadge, { backgroundColor: c.text, borderColor: c.background }]}><Camera size={18} color={c.background} /></View>
          </Pressable>
          <Txt v="captionMedium" color={c.accent} style={{ marginTop: 12 }}>{t('onboarding.addPhoto')}</Txt>
        </Animated.View>
        <Txt v="captionMedium" color={c.textSecondary} style={{ marginBottom: 6 }}>{t('social.name')}</Txt>
        <TextInput
          value={name}
          onChangeText={(v) => { setName(v.slice(0, 40)); if (!handle || handle === normalizeHandle(name)) setHandle(normalizeHandle(v)); }}
          placeholder={t('social.namePlaceholder')}
          placeholderTextColor={c.textTertiary}
          style={[styles.input, { backgroundColor: c.surface, borderColor: c.divider, color: c.text }]}
        />
        <Txt v="captionMedium" color={c.textSecondary} style={{ marginTop: 14, marginBottom: 6 }}>{t('social.handle')}</Txt>
        <View style={[styles.input, { backgroundColor: c.surface, borderColor: c.divider, flexDirection: 'row', alignItems: 'center' }]}>
          <Txt v="body" color={c.textTertiary}>@</Txt>
          <TextInput value={handle} onChangeText={(v) => setHandle(normalizeHandle(v))} autoCapitalize="none" autoCorrect={false} style={{ flex: 1, color: c.text, fontFamily: fonts.regular, fontSize: 16, height: 50 }} />
        </View>
        <Txt v="caption" color={c.textTertiary} style={{ marginTop: 4 }}>{t('social.handleRules')}</Txt>
      </ScrollView>
      <BottomCta title={t('common.continue')} onPress={save} />
    </View>
  );
}

function Ready({ t, onDone }: { t: (k: string) => string; onDone: () => void }) {
  const { c } = useTheme();
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(150, withSpring(1, { damping: 10 }));
    haptic.success();
  }, []);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.l }}>
      <Animated.View style={[{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }, a]}>
        <Check size={44} color="#fff" />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(300)} style={{ alignItems: 'center' }}>
        <Txt v="display" center>{t('onboarding.readyTitle')}</Txt>
        <Txt v="body" color={c.textSecondary} center style={{ marginTop: 12, marginBottom: 32, maxWidth: 320 }}>{t('onboarding.readySub')}</Txt>
        <Button title={t('onboarding.openCamera')} onPress={onDone} style={{ minWidth: 260 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, height: 56, borderRadius: radius.m, borderWidth: 1 },
  bottomCta: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  check: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: '#3B5BDB', alignItems: 'center', justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingHorizontal: 18, borderRadius: radius.m },
  verdict: { position: 'absolute', top: 14, right: 14, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', shadowColor: '#fff', shadowOpacity: 0.9, shadowRadius: 10 },
  dotRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff' },
  bubble: { position: 'absolute', top: '58%', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  camBadge: { position: 'absolute', right: 0, bottom: 0, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  input: { height: 52, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 16 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#fff', borderRadius: 4 },
});
