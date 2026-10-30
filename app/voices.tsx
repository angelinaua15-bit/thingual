import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import {
  RecordingPresets, createAudioPlayer, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState, type AudioPlayer,
} from 'expo-audio';
import { ChevronLeft, Ellipsis, Mic, Pause, Play, Square, Volume2 } from '../src/components/icons';
import { Txt, EmptyState } from '../src/components/ui';
import { EmojiArt } from '../src/components/NoteBits';
import { Floaty } from '../src/components/Fx';
import { ChunkyButton } from '../src/components/PathBits';
import { PlayerFace } from '../src/components/ArenaBits';
import { Sheet, toast } from '../src/components/Overlay';
import { useTheme, fonts, radius } from '../src/theme/tokens';
import { useT, languageName } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { goBack } from '../src/lib/nav';
import { haptic, speak } from '../src/lib/feedback';
import { qc, useNet, connect } from '../src/lib/queries';
import { block, ensureSession } from '../src/lib/api';
import { exprMeaning } from '../src/data/expressions';
import type { LangCode } from '../src/data/languages';
import {
  STICKERS, deleteVoice, myReactions, phraseOfDay, phraseText, publishVoice, react, reportVoice, voicesOf, type StickerId, type Voice,
} from '../src/lib/arena';

const MAX_MS = 10_000;

/** One shared player: tapping another postcard stops the previous one. */
let current: { id: string; p: AudioPlayer } | null = null;
function useNowPlaying() {
  const [playing, setPlaying] = useState<string | null>(null);
  const play = (id: string, src: string) => {
    if (current) { current.p.remove(); const was = current.id; current = null; if (was === id) { setPlaying(null); return; } }
    const p = createAudioPlayer(src);
    current = { id, p };
    p.addListener('playbackStatusUpdate', (st) => { if (st.didJustFinish && current?.id === id) { current.p.remove(); current = null; setPlaying(null); } });
    p.play();
    setPlaying(id);
  };
  useEffect(() => () => { current?.p.remove(); current = null; }, []);
  return { playing, play };
}

/** Voice postcards: everyone says the same phrase of the day; listen to the world and react with stickers. */
export default function Voices() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const s = useApp((x) => x.settings);
  const kid = useApp((x) => x.profile.ageGroup === 'under13');
  const status = useNet((x) => x.status);
  const lang = s.active;
  const native: LangCode = s.native;
  const phrase = phraseOfDay();
  const text = phraseText(lang);
  const meaning = native !== lang ? exprMeaning(phrase, native) : '';
  const [me, setMe] = useState('');
  const { playing, play } = useNowPlaying();
  const [mine, setMine] = useState<{ uri: string; ms: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<Voice | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rec = useAudioRecorderState(recorder, 100);
  const recording = rec.isRecording;
  const stopping = useRef(false);

  useEffect(() => { ensureSession().then(setMe).catch(() => {}); }, []);
  const list = useQuery({ queryKey: ['voices', lang], queryFn: () => voicesOf(lang), enabled: status === 'ok' });
  const ids = useMemo(() => (list.data ?? []).map((v) => v.id), [list.data]);
  const reacts = useQuery({ queryKey: ['voiceReacts', ids.join(',')], queryFn: () => myReactions(ids), enabled: ids.length > 0 });
  const [localReact, setLocalReact] = useState<Record<string, StickerId | null>>({});

  const start = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) { toast(t('voices.perm')); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setMine(null);
      haptic.light();
    } catch {
      toast(t('voices.noMic'));
    }
  };
  const stop = async () => {
    if (stopping.current) return;
    stopping.current = true;
    const ms = rec.durationMillis;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      if (recorder.uri && ms >= 400) setMine({ uri: recorder.uri, ms });
      haptic.success();
    } finally { stopping.current = false; }
  };
  useEffect(() => { if (recording && rec.durationMillis >= MAX_MS) stop(); }, [rec.durationMillis, recording]);

  const publish = async () => {
    if (!mine || busy) return;
    setBusy(true);
    try {
      await publishVoice({ uri: mine.uri, lang, durationMs: mine.ms });
      toast(t('voices.published'), 'success');
      haptic.success();
      setMine(null);
      qc.invalidateQueries({ queryKey: ['voices', lang] });
    } catch {
      toast(t('arena.offline'));
    } finally { setBusy(false); }
  };

  const tapSticker = async (v: Voice, st: StickerId) => {
    const cur = localReact[v.id] !== undefined ? localReact[v.id] : reacts.data?.[v.id] ?? null;
    const next = cur === st ? null : st;
    haptic.light();
    setLocalReact((x) => ({ ...x, [v.id]: next }));
    try { await react(v.id, next); } catch { setLocalReact((x) => ({ ...x, [v.id]: cur })); }
  };
  const countOf = (v: Voice, st: StickerId) => {
    const base = v.reactions?.[st] ?? 0;
    const server = reacts.data?.[v.id] ?? null;
    const local = localReact[v.id];
    if (local === undefined) return base;
    return base - (server === st ? 1 : 0) + (local === st ? 1 : 0);
  };

  const header = (
    <View>
      <LinearGradient colors={['#DB2777', '#9333EA', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 4 }]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {['🎙️', '🌍', '💌', '🎵', '✨'].map((e, k) => (
            <Floaty key={k} amp={10} period={2400 + k * 450} delay={k * 250} style={{ position: 'absolute', opacity: 0.18, top: 40 + (k * 47) % 200, [k % 2 ? 'left' : 'right']: 12 + (k * 31) % 70 }}>
              <EmojiArt emoji={e} size={40} />
            </Floaty>
          ))}
        </View>
        <Pressable onPress={() => goBack('/(tabs)/arena')} hitSlop={12} style={styles.back}><ChevronLeft size={26} color="#fff" /></Pressable>
        <View style={{ alignItems: 'center', maxWidth: 560, width: '100%', alignSelf: 'center' }}>
          <Txt v="overline" color="rgba(255,255,255,.85)">{t('voices.today')} · {languageName(lang, s.uiLang)}</Txt>
          <Animated.View entering={ZoomIn.springify()}>
            <Txt style={styles.phrase}>“{text}”</Txt>
          </Animated.View>
          {meaning ? <Txt v="callout" color="rgba(255,255,255,.85)" center>{t('voices.meaning', { text: meaning })}</Txt> : null}

          <View style={styles.controls}>
            <Pressable onPress={() => speak(text, lang)} style={styles.small} accessibilityLabel={t('voices.listen')}>
              <Volume2 size={20} color="#fff" /><Txt v="captionMedium" color="#fff">{t('voices.listen')}</Txt>
            </Pressable>
            <Pressable onPress={recording ? stop : start} style={[styles.mic, { backgroundColor: recording ? '#EF4444' : '#fff' }]} accessibilityLabel={recording ? t('voices.recording') : t('voices.record')}>
              {recording && <View style={[styles.pulse, { animationName: { from: { transform: [{ scale: 1 }], opacity: 0.7 }, to: { transform: [{ scale: 1.7 }], opacity: 0 } }, animationDuration: 1100, animationIterationCount: 'infinite' } as never]} />}
              {recording ? <Square size={28} color="#fff" fill="#fff" /> : <Mic size={34} color="#9333EA" />}
            </Pressable>
            <Pressable disabled={!mine} onPress={() => mine && play('mine', mine.uri)} style={[styles.small, { opacity: mine ? 1 : 0.4 }]}>
              {playing === 'mine' ? <Pause size={20} color="#fff" /> : <Play size={20} color="#fff" />}<Txt v="captionMedium" color="#fff">{t('voices.play')}</Txt>
            </Pressable>
          </View>
          <View style={styles.recBar}><View style={[styles.recFill, { width: `${Math.min(100, ((recording ? rec.durationMillis : mine?.ms ?? 0) / MAX_MS) * 100)}%` }]} /></View>
          <Txt v="caption" color="rgba(255,255,255,.8)" style={{ marginTop: 6 }}>{recording ? t('voices.recording') : kid ? t('voices.kids') : t('voices.rules')}</Txt>
          {mine && !kid && !recording && (
            <Animated.View entering={FadeInDown} style={{ alignSelf: 'stretch', marginTop: 14 }}>
              <ChunkyButton title={busy ? '…' : t('voices.publish')} color="#16A34A" disabled={busy} onPress={publish} />
            </Animated.View>
          )}
        </View>
      </LinearGradient>
      <Txt v="overline" color={c.textTertiary} style={{ marginTop: 18, marginBottom: 8, marginHorizontal: 16 }}>{t('voices.feed')}</Txt>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FlatList
        data={list.data ?? []}
        keyExtractor={(v) => v.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        renderItem={({ item: v, index }) => {
          const myPick = localReact[v.id] !== undefined ? localReact[v.id] : reacts.data?.[v.id] ?? null;
          const isMine = v.user_id === me;
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40)} style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <PlayerFace card={v.author} size={42} />
                <View style={{ flex: 1 }}>
                  <Txt v="bodyMedium" numberOfLines={1}>{isMine ? t('voices.mine') : v.author?.name || `@${v.author?.handle ?? '…'}`}</Txt>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {v.author?.native_lang === lang && <View style={styles.native}><Txt style={styles.nativeTxt}>{t('voices.native')}</Txt></View>}
                    {v.author?.native_lang ? <Txt v="caption" color={c.textSecondary}>{languageName(v.author.native_lang as LangCode, s.uiLang)}</Txt> : null}
                  </View>
                </View>
                <Pressable onPress={() => setMenu(v)} hitSlop={10} style={{ padding: 4 }}><Ellipsis size={20} color={c.textTertiary} /></Pressable>
              </View>
              <Pressable onPress={() => play(v.id, v.url)} style={[styles.wave, { backgroundColor: playing === v.id ? '#9333EA' : c.surfaceAlt }]}>
                {playing === v.id ? <Pause size={18} color="#fff" /> : <Play size={18} color={c.text} />}
                <Bars id={v.id} active={playing === v.id} color={playing === v.id ? '#fff' : c.textTertiary} />
                <Txt v="captionMedium" color={playing === v.id ? '#fff' : c.textSecondary}>{(v.duration_ms / 1000).toFixed(1)}s</Txt>
              </Pressable>
              <View style={styles.stickers}>
                {STICKERS.map((st) => {
                  const n = countOf(v, st.id);
                  const on = myPick === st.id;
                  return (
                    <Pressable key={st.id} onPress={() => tapSticker(v, st.id)} style={[styles.sticker, { backgroundColor: on ? '#F3E8FF' : c.surfaceAlt, borderColor: on ? '#9333EA' : 'transparent' }]}>
                      <EmojiArt emoji={st.emoji} size={20} />
                      {n > 0 && <Txt style={{ fontFamily: fonts.semibold, fontSize: 12, color: on ? '#7E22CE' : c.textSecondary }}>{n}</Txt>}
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          status === 'offline' ? <EmptyState title={t('arena.offline')} cta={t('arena.retry')} onCta={() => connect()} />
            : list.isLoading || status === 'idle' ? <ActivityIndicator style={{ marginTop: 30 }} color={c.textSecondary} />
            : <EmptyState art={<EmojiArt emoji="💌" size={64} />} title={t('voices.empty')} />
        }
      />
      <Sheet visible={!!menu} onClose={() => setMenu(null)}>
        {menu && (menu.user_id === me ? (
          <Pressable style={styles.menuRow} onPress={async () => { const v = menu; setMenu(null); await deleteVoice(v).catch(() => {}); qc.invalidateQueries({ queryKey: ['voices', lang] }); }}>
            <Txt v="bodyMedium" color="#DC2626">{t('voices.delete')}</Txt>
          </Pressable>
        ) : (
          <>
            <Pressable style={styles.menuRow} onPress={async () => { const v = menu; setMenu(null); await reportVoice(v.id).catch(() => {}); toast(t('voices.reported')); }}>
              <Txt v="bodyMedium">{t('voices.report')}</Txt>
            </Pressable>
            <Pressable style={styles.menuRow} onPress={async () => { const v = menu; setMenu(null); await block(v.user_id).catch(() => {}); qc.invalidateQueries({ queryKey: ['voices', lang] }); }}>
              <Txt v="bodyMedium" color="#DC2626">{t('social.block')}</Txt>
            </Pressable>
          </>
        ))}
      </Sheet>
    </View>
  );
}

/** Little sound bars; they dance while the postcard plays. */
function Bars({ id, active, color }: { id: string; active: boolean; color: string }) {
  const hs = useMemo(() => Array.from({ length: 22 }, (_, k) => 6 + ((id.charCodeAt(k % id.length) * (k + 3)) % 18)), [id]);
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 28 }}>
      {hs.map((h, k) => (
        <View key={k} style={[{ width: 3, height: h, borderRadius: 2, backgroundColor: color },
          active ? ({ animationName: { from: { transform: [{ scaleY: 0.4 }] }, to: { transform: [{ scaleY: 1.2 }] } }, animationDuration: 300 + (k % 5) * 70, animationIterationCount: 'infinite', animationDirection: 'alternate' } as never) : null]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  phrase: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 40, color: '#fff', textAlign: 'center', marginVertical: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 18 },
  small: { alignItems: 'center', gap: 4, width: 64 },
  mic: { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  pulse: { position: 'absolute', width: 86, height: 86, borderRadius: 43, backgroundColor: '#EF4444' },
  recBar: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.25)', marginTop: 18, overflow: 'hidden' },
  recFill: { height: 6, borderRadius: 3, backgroundColor: '#FDE047' },
  card: { marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, maxWidth: 640, alignSelf: Platform.OS === 'web' ? 'center' : undefined, width: Platform.OS === 'web' ? '92%' : undefined },
  native: { backgroundColor: '#DCFCE7', paddingHorizontal: 6, height: 18, borderRadius: 9, justifyContent: 'center' },
  nativeTxt: { fontSize: 10.5, color: '#15803D', fontWeight: '600' },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingHorizontal: 14, height: 48, borderRadius: 24 },
  stickers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  sticker: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 9, borderRadius: 17, borderWidth: 1.5 },
  menuRow: { paddingVertical: 16, paddingHorizontal: 4 },
});
