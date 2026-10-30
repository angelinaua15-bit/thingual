import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions, ImageStyle, StyleProp } from 'react-native';
import { goBack } from '../../src/lib/nav';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, Extrapolation } from 'react-native-reanimated';
import { ArrowLeft, Bookmark, FolderPlus, Image as ImageIcon, Mic, Share2, Trash2, Turtle, Volume2 } from '../../src/components/icons';
import { Button, PressableScale, Txt, Chip } from '../../src/components/ui';
import { Photo, photoForWord } from '../../src/components/Photo';
import { CollectionSheet } from '../../src/components/CollectionSheet';
import { toast } from '../../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../../src/theme/tokens';
import { useT, languageName } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { photosFor, unsplash } from '../../src/data/photos';
import { conceptById, fullWord, labelOf } from '../../src/data/concepts';
import { LANGUAGES, lang } from '../../src/data/languages';
import { haptic, speak } from '../../src/lib/feedback';
import { mastery, formatInterval } from '../../src/lib/srs';
import { listenOnce, similarity, speechRecognitionAvailable } from '../../src/lib/speech';

export default function WordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const concept = conceptById(id ?? '');
  const { c } = useTheme();
  const { t, ta } = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const s = useApp((x) => x.settings);
  const word = useApp((x) => (id ? x.words[id] : undefined));
  const saveWord = useApp((x) => x.saveWord);
  const removeWord = useApp((x) => x.removeWord);
  const setNote = useApp((x) => x.setNote);
  const [showOriginal, setShowOriginal] = useState(false);
  const [colOpen, setColOpen] = useState(false);
  const [note, setNoteLocal] = useState(word?.note ?? '');
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });

  const heroH = Math.min(height * 0.5, 520);
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-200, 0, heroH], [-100, 0, heroH * 0.35], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [-200, 0], [1.4, 1], Extrapolation.CLAMP) },
    ],
  }));
  const barStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [heroH - 140, heroH - 80], [0, 1], Extrapolation.CLAMP) }));

  if (!concept) return null;
  const target = s.active;
  const l = labelOf(concept.id, target)!;
  const nat = labelOf(concept.id, s.native)!;
  const ownPhoto = word?.photo;
  const heroUri = showOriginal || !ownPhoto ? photoForWord(concept.id, undefined, 1200) : ownPhoto;
  const example = (concept.examples as Record<string, string | undefined>)[target];
  const exampleNative = (concept.examples as Record<string, string | undefined>)[s.native] ?? concept.examples.en;
  const unsplashPhotos = photosFor(concept.id);
  const level = word ? mastery(word.card) : 0;


  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: heroH }, heroStyle]}>
        <Photo uri={heroUri} style={StyleSheet.absoluteFill as StyleProp<ImageStyle>} transition={400} />
        <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent', 'transparent']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: heroH - 28, paddingBottom: 140 }}>
        <View style={[styles.sheet, { backgroundColor: c.background }]}>
          <View style={{ maxWidth: 640, width: '100%', alignSelf: 'center' }}>
            {/* word */}
            <Animated.View entering={FadeInDown.duration(500)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Txt v="overline" color={c.textSecondary}>{languageName(target, s.uiLang)}</Txt>
                {word && <Txt v="overline" color={level === 3 ? c.success : c.accent}>· {ta('word.mastery')[level]}</Txt>}
              </View>
              {l.article ? <Txt v="callout" color={c.textSecondary}>{l.article}</Txt> : null}
              <Txt style={{ fontFamily: fonts.serif, fontSize: 60, lineHeight: 64, color: c.text, letterSpacing: -1, writingDirection: lang(target).rtl ? 'rtl' : 'ltr' }}>{l.word}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                {l.roman ? <Txt v="body" color={c.textSecondary}>{l.roman}</Txt> : null}
                {target === 'en' ? <Txt v="body" color={c.textSecondary}>{concept.ipa}</Txt> : null}
                <Txt v="body" color={c.textTertiary}>·</Txt>
                <Txt v="body" color={c.textSecondary}>{nat.word}</Txt>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <PressableScale onPress={() => speak(l.word, target)} style={[styles.audio, { backgroundColor: c.ink }]}>
                  <Volume2 size={20} color={c.background} />
                  <Txt v="bodyMedium" color={c.background}>{l.article ? fullWord(concept.id, target) : l.word}</Txt>
                </PressableScale>
                <PressableScale onPress={() => speak(l.word, target, { slow: true })} style={[styles.audioSm, { backgroundColor: c.surfaceAlt }]}>
                  <Turtle size={20} color={c.text} />
                  <Txt v="captionMedium">{t('word.slow')}</Txt>
                </PressableScale>
              </View>
              {word && (
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 18, alignItems: 'center' }}>
                  {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= level ? (level === 3 ? c.success : c.accent) : c.divider }} />
                  ))}
                  <Txt v="captionMedium" color={c.textSecondary} style={{ marginLeft: 8 }}>{ta('word.mastery')[level]}</Txt>
                </View>
              )}
              {word && (
                <Txt v="caption" color={c.textSecondary} style={{ marginTop: 6 }}>
                  {t('word.nextReview', { when: t('time.in', { t: formatInterval(Math.max(0, new Date(word.card.due).getTime() - Date.now()), t) }) })}
                </Txt>
              )}
            </Animated.View>

            {/* example */}
            {example ? (
              <Animated.View entering={FadeInDown.delay(100)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
                <Txt v="overline" color={c.textSecondary} style={{ marginBottom: 8 }}>{t('word.examples')}</Txt>
                <Pressable onPress={() => speak(example, target)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Txt style={{ fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, color: c.text }}>{example}</Txt>
                    {exampleNative && exampleNative !== example ? <Txt v="callout" color={c.textSecondary} style={{ marginTop: 6 }}>{exampleNative}</Txt> : null}
                  </View>
                  <Volume2 size={18} color={c.textSecondary} style={{ marginTop: 6 }} />
                </Pressable>
              </Animated.View>
            ) : null}

            {/* pronunciation */}
            <Pronunciation word={l.word} />

            {/* world says */}
            <Animated.View entering={FadeInDown.delay(180)} style={{ marginTop: space.l }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Txt v="headline">{t('word.worldSays')}</Txt>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
                {LANGUAGES.filter((x) => x.code !== target).map((x) => {
                  const lb = concept.labels[x.code];
                  return (
                    <PressableScale key={x.code} onPress={() => speak(lb.word, x.code)} style={[styles.langCard, { backgroundColor: c.surface, borderColor: c.divider }]}>
                      <Txt style={{ fontFamily: fonts.serif, fontSize: 22, color: c.text }} numberOfLines={1}>{lb.word}</Txt>
                      <Txt v="caption" color={c.textSecondary} numberOfLines={1}>{lb.roman ?? x.native}</Txt>
                      {lb.roman ? <Txt v="caption" color={c.textTertiary} numberOfLines={1} style={{ fontSize: 11 }}>{x.native}</Txt> : null}
                    </PressableScale>
                  );
                })}
              </ScrollView>
            </Animated.View>

            {/* photos from people (real posts) and from Unsplash */}
            {unsplashPhotos.length > 0 && (
              <Animated.View entering={FadeInDown.delay(240)} style={{ marginTop: space.l }}>
                <Txt v="headline" style={{ marginBottom: 12 }}>{t('social.fromUnsplash')}</Txt>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {unsplashPhotos.map((p) => (
                    <View key={p.id} style={{ width: 150 }}>
                      <View style={{ width: 150, height: 190, borderRadius: radius.m, overflow: 'hidden' }}>
                        <Photo uri={unsplash(p.path, 400)} style={{ width: '100%', height: '100%' }} />
                      </View>
                      <Txt v="caption" color={c.textSecondary} numberOfLines={1} style={{ marginTop: 4, fontSize: 11 }}>{p.author}{p.place ? ` · ${p.place}` : ''}</Txt>
                    </View>
                  ))}
                </ScrollView>
              </Animated.View>
            )}

            {/* related */}
            {concept.related.length > 0 && (
              <View style={{ marginTop: space.l }}>
                <Txt v="headline" style={{ marginBottom: 12 }}>{t('word.related')}</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {concept.related.map((r) => (
                    <Chip key={r} label={fullWord(r, target)} onPress={() => router.push({ pathname: '/word/[id]', params: { id: r } })} />
                  ))}
                </View>
              </View>
            )}

            {/* note */}
            {word && (
              <View style={{ marginTop: space.l }}>
                <Txt v="headline" style={{ marginBottom: 10 }}>{t('word.note')}</Txt>
                <TextInput
                  value={note}
                  onChangeText={setNoteLocal}
                  onBlur={() => setNote(concept.id, note)}
                  placeholder={t('word.notePlaceholder')}
                  placeholderTextColor={c.textTertiary}
                  multiline
                  style={[styles.note, { backgroundColor: c.surface, borderColor: c.divider, color: c.text }]}
                />
              </View>
            )}

            {/* actions */}
            {word && (
              <View style={{ marginTop: space.l, gap: 10 }}>
                <ActionRow icon={<FolderPlus size={20} color={c.text} />} label={t('word.addToCollection')} onPress={() => setColOpen(true)} />
                <ActionRow icon={<Share2 size={20} color={c.text} />} label={t('word.postcard')} onPress={() => router.push({ pathname: '/postcard/[id]', params: { id: concept.id } })} />
                <ActionRow icon={<Trash2 size={20} color={c.error} />} label={t('word.remove')} danger onPress={() => { removeWord(concept.id); goBack(); }} />
              </View>
            )}
          </View>
        </View>
      </Animated.ScrollView>

      {/* top bar */}
      <Animated.View style={[styles.solidBar, { height: insets.top + 56, backgroundColor: c.background, borderColor: c.divider }, barStyle]} pointerEvents="none">
        <Txt style={{ fontFamily: fonts.serif, fontSize: 22, color: c.text, marginBottom: 10 }}>{l.word}</Txt>
      </Animated.View>
      <View style={[styles.topBtns, { top: insets.top + 8 }]}>
        <Pressable onPress={() => (goBack('/(tabs)/dictionary'))} style={styles.glass}>
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }} />
        {ownPhoto && !ownPhoto.startsWith('https://') ? (
          <Pressable onPress={() => setShowOriginal((v) => !v)} style={[styles.glass, { width: 'auto', paddingHorizontal: 12, flexDirection: 'row', gap: 6 }]}>
            <ImageIcon size={16} color="#fff" />
            <Txt v="captionMedium" color="#fff">{showOriginal ? t('word.yourPhoto') : t('word.original')}</Txt>
          </Pressable>
        ) : null}
      </View>

      {!word && (
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + 12, backgroundColor: c.background, borderColor: c.divider }]}>
          <Button
            title={t('word.learnThis')}
            icon={<Bookmark size={18} color={c.onAccent} />}
            onPress={() => { saveWord(concept.id, '', 'world'); haptic.success(); toast(t('word.savedToast')); }}
            style={{ maxWidth: 600, width: '100%', alignSelf: 'center' }}
          />
        </View>
      )}
      <CollectionSheet visible={colOpen} onClose={() => setColOpen(false)} conceptId={concept.id} />
    </View>
  );
}

function ActionRow({ icon, label, onPress, danger, disabled }: { icon: React.ReactNode; label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={disabled ? undefined : onPress} style={[styles.action, { backgroundColor: c.surface, borderColor: c.divider, opacity: disabled ? 0.45 : 1 }]}>
      {icon}
      <Txt v="bodyMedium" color={danger ? c.error : c.text}>{label}</Txt>
    </PressableScale>
  );
}

/* ---------------- Pronunciation practice ---------------- */
function Pronunciation({ word }: { word: string }) {
  const { c } = useTheme();
  const { t } = useT();
  const s = useApp((x) => x.settings);
  const [state, setState] = useState<'idle' | 'listening' | 'done'>('idle');
  const [score, setScore] = useState<number | null>(null);
  const [heard, setHeard] = useState('');
  const stopRef = useRef<() => void>(() => {});
  const available = speechRecognitionAvailable();
  const pulse = useSharedValue(1);
  const micStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const start = () => {
    if (!available) {
      speak(word, s.active);
      return;
    }
    setState('listening');
    pulse.value = withSpring(1.15);
    stopRef.current = listenOnce(
      lang(s.active).voice,
      (text) => {
        setHeard(text);
        const sc = similarity(text, word);
        setScore(sc);
        sc >= 70 ? haptic.success() : haptic.error();
      },
      () => {
        pulse.value = withSpring(1);
        setState('done');
      },
    );
  };

  return (
    <Animated.View entering={FadeInDown.delay(140)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Txt v="overline" color={c.textSecondary} style={{ flex: 1 }}>{t('word.practise')}</Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable onPressIn={start} onPressOut={() => stopRef.current()} accessibilityLabel={t('word.holdToSpeak')}>
          <Animated.View style={[styles.mic, { backgroundColor: state === 'listening' ? c.drop : c.accent }, micStyle]}>
            <Mic size={24} color="#fff" />
          </Animated.View>
        </Pressable>
        <View style={{ flex: 1 }}>
          {score === null ? (
            <Txt v="callout" color={c.textSecondary}>{available ? (state === 'listening' ? t('word.listening') : t('word.holdToSpeak')) : t('word.pronunciationUnavailable')}</Txt>
          ) : (
            <>
              <Txt v="headline" color={score >= 70 ? c.success : c.drop}>{t('word.score', { n: score })}</Txt>
              <Txt v="caption" color={c.textSecondary}>“{heard}”</Txt>
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 28, minHeight: 600 },
  audio: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, height: 48, borderRadius: 999 },
  audioSm: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 48, borderRadius: 999 },
  card: { marginTop: 24, padding: 18, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  langCard: { width: 132, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth },
  note: { minHeight: 90, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth, padding: 14, fontFamily: fonts.regular, fontSize: 16, textAlignVertical: 'top' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 56, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth },
  solidBar: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'flex-end', borderBottomWidth: StyleSheet.hairlineWidth },
  topBtns: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center' },
  glass: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.38)', alignItems: 'center', justifyContent: 'center' },
  saveBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  mic: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});

