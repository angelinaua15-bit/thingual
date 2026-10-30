import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, SlideInLeft, SlideInRight, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { X } from '../src/components/icons';
import { Txt } from '../src/components/ui';
import { EmojiArt } from '../src/components/NoteBits';
import { TimerRing } from '../src/components/Overlay';
import { ChunkyButton, Mascot } from '../src/components/PathBits';
import { Confetti, CountUp, Floaty } from '../src/components/Fx';
import { GlassButton, PlayerFace } from '../src/components/ArenaBits';
import { fonts, radius, space } from '../src/theme/tokens';
import { useT, languageName } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { conceptById, fullWord, labelOf } from '../src/data/concepts';
import type { LangCode } from '../src/data/languages';
import { haptic, speak } from '../src/lib/feedback';
import { goBack } from '../src/lib/nav';
import { sfx } from '../src/lib/sfx';
import { shareText } from '../src/lib/share';
import { qc, useNet } from '../src/lib/queries';
import {
  BOTS, DUEL_QUESTIONS, DUEL_SECONDS, botRun, claimDuel, duelByCode, duelLink, duelQuestions, finishDuel, newSeed, postRun, runScore, stepPoints,
  type Card, type Step,
} from '../src/lib/arena';

type Phase = 'intro' | 'search' | 'vs' | 'play' | 'result' | 'message';
type Opp = { card?: Card | null; botId?: string } | null;

/** Duel 1 on 1: the same 10 words for both players; you race the other player's recorded run live. */
export default function Duel() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ friend?: string; code?: string }>();
  const s = useApp((x) => x.settings);
  const net = useNet((x) => x.status);
  const friendMode = params.friend === '1';
  const [phase, setPhase] = useState<Phase>(params.code ? 'search' : friendMode ? 'intro' : 'search');
  const [message, setMessage] = useState('');
  const [round, setRound] = useState<{ seed: number; lang: LangCode; level: string; ghost: Step[] | null; opp: Opp; claimedId?: string; fromCode?: boolean }>();
  const [log, setLog] = useState<Step[]>([]);
  const [i, setI] = useState(0);
  const [flash, setFlash] = useState<null | { id: string; ok: boolean }>(null);
  const [now, setNow] = useState(0);
  const [sent, setSent] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const startAt = useRef(0);
  const qAt = useRef(0);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const lang = round?.lang ?? s.active;
  const native: LangCode = s.native === lang ? (lang === 'en' ? 'uk' : 'en') : s.native;
  const qs = useMemo(() => (round ? duelQuestions(round.seed, round.lang, round.level, native) : []), [round, native]);
  const q = qs[i];

  /* ---------------- find an opponent ---------------- */
  const [randomOnly, setRandomOnly] = useState(false);
  const search = async (forceRandom = randomOnly) => {
    if (forceRandom) setRandomOnly(true);
    const code = forceRandom ? undefined : params.code;
    const asFriend = !forceRandom && friendMode;
    setPhase('search');
    setLog([]); setI(0); setSent(null); setXp(0);
    const level = s.cefr ?? 'A1';
    const minWait = new Promise((r) => setTimeout(r, 1700));
    let next: typeof round;
    try {
      if (code) {
        const d = await duelByCode(String(code));
        await minWait;
        if (!d) { setMessage(t('duel.notFound')); setPhase('message'); return; }
        if (d.taken) { setMessage(t('duel.taken')); setPhase('message'); return; }
        if (d.mine) { setMessage(d.b_score != null ? `${d.a_score} : ${d.b_score}` : t('duel.mineWaiting')); setPhase('message'); return; }
        next = { seed: d.seed, lang: d.lang, level: d.level, ghost: d.a_log, opp: { card: d.opponent }, claimedId: d.id, fromCode: true };
      } else if (asFriend) {
        next = { seed: newSeed(), lang: s.active, level, ghost: null, opp: null };
      } else {
        const d = net === 'ok' ? await claimDuel(s.active, level).catch(() => null) : null;
        await minWait;
        if (d) next = { seed: d.seed, lang: d.lang, level: d.level, ghost: d.a_log, opp: { card: d.opponent }, claimedId: d.id };
        else {
          const seed = newSeed();
          const bot = BOTS[seed % BOTS.length];
          next = { seed, lang: s.active, level, ghost: botRun(seed, bot), opp: { botId: bot.id } };
        }
      }
    } catch {
      setMessage(t('arena.offline'));
      setPhase('message');
      return;
    }
    setRound(next);
    setPhase('vs');
    sfx('combo', 0.7);
    setTimeout(() => {
      startAt.current = Date.now();
      qAt.current = Date.now();
      setNow(Date.now());
      setPhase('play');
    }, 2600);
  };
  useEffect(() => { if (phase === 'search') search(); }, []);

  /* ---------------- clock: question timer + the ghost's live progress ---------------- */
  useEffect(() => {
    if (phase !== 'play') return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [phase]);
  const qLeft = phase === 'play' ? Math.max(0, DUEL_SECONDS - (now - qAt.current) / 1000) : DUEL_SECONDS;
  useEffect(() => {
    if (phase === 'play' && qLeft <= 0 && !flash && q) answer(null);
  }, [qLeft, phase]);

  const ghost = round?.ghost ?? null;
  const ghostAt = (ms: number) => {
    if (!ghost) return { n: 0, score: 0 };
    let tm = 0, n = 0, score = 0;
    for (const st of ghost) { tm += st[0]; if (tm > ms) break; n++; score += stepPoints(st); }
    return { n, score };
  };
  const ghostLive = phase === 'result' ? { n: ghost?.length ?? 0, score: ghost ? runScore(ghost) : 0 } : ghostAt(now - startAt.current);
  const myScore = runScore(log);

  const answer = (id: string | null) => {
    if (flash || !q) return;
    const ms = Math.min(DUEL_SECONDS * 1000, Date.now() - qAt.current);
    const ok = id === q.word;
    const step: Step = [ms, ok ? 1 : 0];
    const nextLog = [...log, step];
    setLog(nextLog);
    setFlash({ id: id ?? '', ok });
    if (ok) { haptic.light(); sfx('correct', 0.7); }
    else {
      haptic.error(); sfx('wrong', 0.6);
      shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(0, { duration: 50 }));
    }
    setTimeout(() => {
      setFlash(null);
      if (i + 1 >= qs.length) finish(nextLog);
      else { setI(i + 1); qAt.current = Date.now(); setNow(Date.now()); }
    }, ok ? 350 : 800);
  };

  const finish = (mine: Step[]) => {
    if (!round) return;
    const me = runScore(mine);
    const them = round.ghost ? runScore(round.ghost) : -1;
    const won = them >= 0 && me > them;
    const draw = them >= 0 && me === them;
    setXp(useApp.getState().finishDuel({ correct: mine.filter((x) => x[1]).length, total: mine.length, won, draw }));
    setPhase('result');
    if (won || them < 0) { sfx('fanfare'); haptic.success(); }
    else if (!draw) sfx('wrong', 0.4);
    // server: close the claimed duel and leave my run as a ghost for the next player
    (async () => {
      try {
        if (round.claimedId) await finishDuel(round.claimedId, mine);
        if (!round.fromCode && round.ghost) await postRun({ lang: round.lang, level: round.level, seed: round.seed, log: mine });
      } catch { /* the duel still counts locally */ }
      qc.invalidateQueries({ queryKey: ['myDuels'] });
    })();
  };

  const sendChallenge = async () => {
    if (!round) return;
    try {
      const code = sent ?? (await postRun({ lang: round.lang, level: round.level, seed: round.seed, log, friend: true }));
      if (!code) return;
      setSent(code);
      qc.invalidateQueries({ queryKey: ['myDuels'] });
      await shareText(t('duel.shareText', { lang: languageName(round.lang, s.uiLang), link: duelLink(code) }));
    } catch {
      setMessage(t('arena.offline'));
    }
  };

  const oppName = round?.opp?.botId ? BOTS.find((b) => b.id === round.opp!.botId)!.name : round?.opp?.card ? `@${round.opp.card.handle}` : '?';
  const close = () => goBack('/(tabs)/arena');

  return (
    <LinearGradient colors={['#1E1B4B', '#7C2D12', '#C2410C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {['⚔️', '⭐', '🔥', '✨', '🏆'].map((e, k) => (
          <Floaty key={k} amp={12} period={2600 + k * 400} delay={k * 200} style={{ position: 'absolute', opacity: 0.16, top: `${10 + k * 18}%`, [k % 2 ? 'left' : 'right']: 12 + (k * 29) % 60 }}>
            <EmojiArt emoji={e} size={38 + (k % 3) * 12} />
          </Floaty>
        ))}
      </View>
      <View style={styles.bar}>
        <Pressable onPress={close} hitSlop={12} accessibilityLabel={t('common.close')}><X size={24} color="rgba(255,255,255,.8)" /></Pressable>
        <View style={{ flex: 1 }} />
        {phase === 'play' && <Txt v="captionMedium" color="rgba(255,255,255,.8)">{t('duel.q', { n: i + 1, total: qs.length })}</Txt>}
      </View>

      {phase === 'intro' && (
        <View style={styles.center}>
          <Animated.View entering={ZoomIn.springify()}><EmojiArt emoji="🤝" size={96} /></Animated.View>
          <Txt style={styles.big}>{t('duel.friendTitle')}</Txt>
          <Txt v="body" color="rgba(255,255,255,.85)" center style={{ marginTop: 10, maxWidth: 360 }}>{t('duel.friendSub')}</Txt>
          <View style={{ alignSelf: 'stretch', marginTop: 28, maxWidth: 420, width: '100%' }}>
            <ChunkyButton title={t('duel.friendStart')} color="#16A34A" onPress={() => search()} />
          </View>
        </View>
      )}

      {phase === 'search' && (
        <View style={styles.center}>
          <View style={styles.radar}>
            {[0, 1, 2].map((k) => (
              <Animated.View key={k} style={[styles.ring, { animationName: { from: { transform: [{ scale: 0.3 }], opacity: 0.9 }, to: { transform: [{ scale: 1.4 }], opacity: 0 } }, animationDuration: 1800, animationDelay: k * 600, animationIterationCount: 'infinite' } as never]} />
            ))}
            <PlayerFace me size={84} />
          </View>
          <Txt style={[styles.big, { fontSize: 28, lineHeight: 34 }]}>{t('duel.searching')}</Txt>
          <Txt v="callout" color="rgba(255,255,255,.75)" style={{ marginTop: 6 }}>{t('duel.searchingSub', { lang: languageName(s.active, s.uiLang) })}</Txt>
          <ActivityIndicator color="#fff" style={{ marginTop: 18 }} />
        </View>
      )}

      {phase === 'vs' && round && (
        <View style={styles.center}>
          <View style={styles.vsRow}>
            <Animated.View entering={SlideInLeft.springify().damping(14)} style={styles.vsSide}>
              <PlayerFace me size={96} />
              <Txt v="headline" color="#fff" style={{ marginTop: 10 }}>{t('duel.you')}</Txt>
            </Animated.View>
            <Animated.View entering={ZoomIn.delay(450).springify()}><Txt style={styles.vs}>{t('duel.vs')}</Txt></Animated.View>
            <Animated.View entering={SlideInRight.springify().damping(14)} style={styles.vsSide}>
              {round.opp ? <PlayerFace card={round.opp.card} botId={round.opp.botId} size={96} /> : <View style={styles.unknown}><Txt style={{ fontSize: 44, color: '#fff' }}>?</Txt></View>}
              <Txt v="headline" color="#fff" style={{ marginTop: 10 }} numberOfLines={1}>{oppName}</Txt>
              {round.opp?.botId && <Txt v="caption" color="rgba(255,255,255,.7)">{t('arena.bot')}</Txt>}
            </Animated.View>
          </View>
          <Animated.View entering={FadeIn.delay(900)}><Txt v="callout" color="rgba(255,255,255,.8)" style={{ marginTop: 28 }}>{languageName(round.lang, s.uiLang)} · {round.level} · {DUEL_QUESTIONS} ⚡</Txt></Animated.View>
        </View>
      )}

      {phase === 'play' && q && (
        <View style={{ flex: 1, paddingHorizontal: space.l, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
          {/* race lanes */}
          <View style={styles.lanes}>
            <Lane face={<PlayerFace me size={30} />} n={log.filter((x) => x[1]).length} score={myScore} color="#22C55E" />
            {ghost && <Lane face={<PlayerFace card={round?.opp?.card} botId={round?.opp?.botId} size={30} />} n={ghost.slice(0, ghostLive.n).filter((x) => x[1]).length} score={ghostLive.score} color="#F97316" />}
          </View>
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <TimerRing size={64} width={6} progress={qLeft / DUEL_SECONDS} color={qLeft <= 3 ? '#F87171' : '#FDE047'}>
              <Txt style={{ fontFamily: fonts.semibold, fontSize: 20, color: '#fff', fontVariant: ['tabular-nums'] }}>{Math.ceil(qLeft)}</Txt>
            </TimerRing>
          </View>
          <Animated.View key={i} entering={FadeIn.duration(160)} style={[styles.card, shakeStyle]}>
            <EmojiArt emoji={conceptById(q.word)?.emoji} size={56} />
            <Txt style={{ fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, color: '#fff', textAlign: 'center', marginTop: 8 }}>
              {q.reverse ? labelOf(q.word, native)?.word : fullWord(q.word, lang)}
            </Txt>
          </Animated.View>
          <View style={styles.grid}>
            {q.options.map((o, k) => {
              const f = flash && (flash.id === o || (!flash.ok && o === q.word));
              const bg = f ? (o === q.word ? '#22C55E' : '#EF4444') : 'rgba(255,255,255,.12)';
              return (
                <Pressable key={o} testID={`opt-${k}`} onPress={() => { answer(o); if (q.reverse) speak(fullWord(o, lang), lang); }} style={[styles.opt, { backgroundColor: bg }]}>
                  <Txt v="bodyMedium" color="#fff" center numberOfLines={2}>{q.reverse ? fullWord(o, lang) : labelOf(o, native)?.word}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {phase === 'result' && round && (() => {
        const them = ghost ? runScore(ghost) : null;
        const res = them == null ? 'solo' : myScore > them ? 'win' : myScore < them ? 'lose' : 'draw';
        const missed = qs.filter((_, k) => !log[k]?.[1]).map((x) => x.word);
        return (
          <ScrollView contentContainerStyle={[styles.center, { flexGrow: 1, paddingBottom: 20 }]}>
            {(res === 'win' || res === 'solo') && <Confetti count={90} />}
            <Animated.View entering={ZoomIn.springify().damping(12)}><Mascot size={110} mood={res === 'lose' ? 'sad' : 'dance'} /></Animated.View>
            {res !== 'solo' && <Txt style={styles.big}>{t(`duel.${res}`)}</Txt>}
            <View style={styles.scoreRow}>
              <View style={styles.scoreSide}>
                <PlayerFace me size={56} />
                <CountUp to={myScore} style={styles.score} />
                <Txt v="caption" color="rgba(255,255,255,.75)">{t('duel.correct', { n: log.filter((x) => x[1]).length, total: qs.length })}</Txt>
              </View>
              {them != null && (
                <>
                  <Txt style={[styles.vs, { fontSize: 26 }]}>:</Txt>
                  <View style={styles.scoreSide}>
                    <PlayerFace card={round.opp?.card} botId={round.opp?.botId} size={56} />
                    <CountUp to={them} style={styles.score} />
                    <Txt v="caption" color="rgba(255,255,255,.75)" numberOfLines={1}>{oppName}</Txt>
                  </View>
                </>
              )}
            </View>
            <Txt v="callout" color="rgba(255,255,255,.85)" center style={{ marginTop: 6 }}>
              {res === 'solo' ? t('duel.friendSub') : t(`duel.${res}Sub`)}
            </Txt>
            <Animated.View entering={FadeInDown.delay(300)} style={styles.xp}><Txt v="headline" color="#1E1B4B">{t('duel.xp', { n: xp })}</Txt></Animated.View>
            {missed.length > 0 && (
              <View style={styles.missed}>
                <Txt v="overline" color="rgba(255,255,255,.7)">{t('duel.words')}</Txt>
                <Txt v="callout" color="#fff" style={{ marginTop: 4 }}>{missed.map((w) => `${fullWord(w, lang)} — ${labelOf(w, native)?.word}`).join(' · ')}</Txt>
              </View>
            )}
            <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 22, maxWidth: 420, width: '100%' }}>
              {res === 'solo' ? (
                <>
                  <ChunkyButton title={t('duel.friendSend')} color="#16A34A" onPress={sendChallenge} />
                  {sent && <Txt v="caption" color="rgba(255,255,255,.8)" center>{t('duel.friendWait')}</Txt>}
                </>
              ) : (
                <ChunkyButton title={t('duel.rematch')} color="#16A34A" onPress={() => search(true)} />
              )}
              <Pressable onPress={close} style={{ alignItems: 'center', padding: 12 }}><Txt v="bodyMedium" color="rgba(255,255,255,.85)">{t('duel.done')}</Txt></Pressable>
            </View>
          </ScrollView>
        );
      })()}

      {phase === 'message' && (
        <View style={styles.center}>
          <EmojiArt emoji="🦊" size={84} />
          <Txt v="headline" color="#fff" center style={{ marginTop: 16, maxWidth: 340 }}>{message}</Txt>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
            <GlassButton title={t('arena.find')} onPress={() => search(true)} />
            <GlassButton title={t('duel.done')} onPress={close} />
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

function Lane({ face, n, score, color }: { face: React.ReactNode; n: number; score: number; color: string }) {
  return (
    <View style={styles.lane}>
      {face}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(n / DUEL_QUESTIONS) * 100}%`, backgroundColor: color }]} />
      </View>
      <Txt style={{ fontFamily: fonts.semibold, fontSize: 15, color: '#fff', minWidth: 46, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{score}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.l, alignSelf: 'center', width: '100%', maxWidth: 560 },
  big: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 50, color: '#fff', marginTop: 14, textAlign: 'center' },
  radar: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  ring: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 3, borderColor: 'rgba(253,224,71,.8)' },
  vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, width: '100%' },
  vsSide: { alignItems: 'center', flex: 1 },
  vs: { fontFamily: fonts.serif, fontSize: 52, color: '#FDE047' },
  unknown: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,.5)' },
  lanes: { gap: 8, padding: 12, borderRadius: radius.l, backgroundColor: 'rgba(0,0,0,.18)' },
  lane: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,.15)', overflow: 'hidden' },
  fill: { height: 12, borderRadius: 6 },
  card: { alignItems: 'center', padding: 20, borderRadius: radius.xl, backgroundColor: 'rgba(255,255,255,.1)', marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  opt: { width: '48%', flexGrow: 1, minHeight: 70, borderRadius: radius.l, alignItems: 'center', justifyContent: 'center', padding: 10 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 },
  scoreSide: { alignItems: 'center', minWidth: 110 },
  score: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 46, color: '#fff', marginTop: 6 },
  xp: { backgroundColor: '#FDE047', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, marginTop: 14 },
  missed: { marginTop: 16, padding: 14, borderRadius: radius.m, backgroundColor: 'rgba(255,255,255,.08)', alignSelf: 'stretch' },
});
