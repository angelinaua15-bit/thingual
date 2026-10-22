import React, { useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent, type GestureResponderEvent } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Lock, Pause, Play, RotateCcw, RotateCw } from '../../src/components/icons';
import { Txt, Button } from '../../src/components/ui';
import { BookCover, LevelBadge } from '../../src/components/BookBits';
import { MaxLockCard } from '../../src/components/MaxLock';
import { useTheme, fonts, radius, space } from '../../src/theme/tokens';
import { useT, languageName } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { bookById } from '../../src/data/audiobooks';
import { bookCover, fmtMinutes, fmtTime, useChapters } from '../../src/lib/audiobooks';
import { playBook, seekBy, seekTo, setRate, togglePlay, usePlayer } from '../../src/lib/player';
import { LIMITS, bookOpen, chapterOpen, useIsMax } from '../../src/lib/premium';
import { goBack } from '../../src/lib/nav';

const RATES = [0.75, 0.9, 1, 1.25];

/** One audiobook: cover, player and chapters. */
export default function BookScreen() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const book = bookById(id);
  const ui = useApp((x) => x.settings.uiLang);
  const progress = useApp((x) => x.books[id]);
  const max = useIsMax();
  const chapters = useChapters(book);
  const current = usePlayer((s) => (s.bookId === id ? s : null));
  const trackW = useRef(1);
  const rate = usePlayer((s) => s.rate);

  if (!book) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top, padding: space.l, justifyContent: 'center' }}>
        <Button title={t('common.back')} onPress={() => router.replace('/books')} />
      </View>
    );
  }
  const open = bookOpen(book.id, max);
  const list = chapters.data ?? [];
  const isThis = !!current;
  const ch = isThis ? current!.chapter : progress?.chapter ?? 0;
  const time = isThis ? current!.time : progress?.position ?? 0;
  const duration = isThis ? current!.duration : list[ch]?.seconds ?? 0;
  const playing = isThis && current!.playing;

  const start = (n?: number) => {
    if (!list.length) return;
    if (isThis && (n === undefined || n === current!.chapter)) return togglePlay();
    playBook(book.id, list, n);
  };
  const onSeek = (e: GestureResponderEvent) => {
    if (!isThis || !duration) return;
    seekTo((e.nativeEvent.locationX / trackW.current) * duration);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* blurred cover backdrop */}
        <View style={{ paddingTop: insets.top + 6, paddingBottom: space.l, overflow: 'hidden' }}>
          <Image source={{ uri: bookCover(book.id) }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={40} />
          <LinearGradient colors={['rgba(5,15,30,0.55)', 'rgba(5,15,30,0.35)', c.background]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
          <View style={{ paddingHorizontal: 16 }}>
            <Pressable onPress={() => goBack('/books')} hitSlop={12} style={styles.back}><ArrowLeft size={20} color="#fff" /></Pressable>
          </View>
          <Animated.View entering={ZoomIn.springify().damping(15)} style={{ alignItems: 'center', marginTop: 8 }}>
            <View style={styles.coverShadow}><BookCover id={book.id} width={200} radiusPx={18} /></View>
          </Animated.View>
        </View>

        <View style={{ paddingHorizontal: space.m, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <LevelBadge level={book.level} />
            <Txt v="caption" color={c.textSecondary}>{t(`books.levels.${book.level}`)} · {languageName(book.lang, ui)} · {fmtMinutes(book.minutes, t)}</Txt>
          </View>
          <Txt center style={{ fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, color: c.text, marginTop: 8 }}>{book.title}</Txt>
          <Txt v="callout" center color={c.textSecondary}>{book.author}</Txt>

          {/* player */}
          <Animated.View entering={FadeInDown.delay(80).springify()} style={[styles.player, { backgroundColor: c.surface, borderColor: c.divider }]}>
            <Txt v="captionMedium" color={c.textSecondary} numberOfLines={1} center>
              {list[ch]?.title ?? t('books.chapterN', { n: ch + 1 })}
            </Txt>
            <Pressable onPress={onSeek} onLayout={(e: LayoutChangeEvent) => (trackW.current = e.nativeEvent.layout.width || 1)} style={{ paddingVertical: 12 }} hitSlop={6}>
              <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
                <View style={{ width: `${duration ? Math.min(100, (time / duration) * 100) : 0}%`, height: '100%', borderRadius: 3, backgroundColor: c.accent }} />
              </View>
            </Pressable>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt v="caption" color={c.textTertiary} style={{ fontVariant: ['tabular-nums'] }}>{fmtTime(time)}</Txt>
              <Txt v="caption" color={c.textTertiary} style={{ fontVariant: ['tabular-nums'] }}>{duration ? fmtTime(duration) : '–:––'}</Txt>
            </View>
            <View style={styles.controls}>
              <Pressable onPress={() => seekBy(-15)} disabled={!isThis} hitSlop={8} style={{ opacity: isThis ? 1 : 0.35, alignItems: 'center' }}>
                <RotateCcw size={26} color={c.text} />
                <Txt v="caption" color={c.textSecondary} style={{ fontSize: 10 }}>15</Txt>
              </Pressable>
              <Pressable onPress={() => start()} disabled={chapters.isLoading || !list.length} style={[styles.bigPlay, { backgroundColor: c.accent, opacity: list.length ? 1 : 0.5 }]} accessibilityLabel={playing ? 'pause' : 'play'}>
                {chapters.isLoading || (isThis && current!.buffering) ? <ActivityIndicator color={c.onAccent} /> : playing ? <Pause size={30} color={c.onAccent} fill={c.onAccent} /> : <Play size={30} color={c.onAccent} fill={c.onAccent} style={{ marginLeft: 3 }} />}
              </Pressable>
              <Pressable onPress={() => seekBy(15)} disabled={!isThis} hitSlop={8} style={{ opacity: isThis ? 1 : 0.35, alignItems: 'center' }}>
                <RotateCw size={26} color={c.text} />
                <Txt v="caption" color={c.textSecondary} style={{ fontSize: 10 }}>15</Txt>
              </Pressable>
            </View>
            <View style={styles.rates}>
              <Txt v="caption" color={c.textSecondary}>{t('books.speed')}</Txt>
              {RATES.map((r) => {
                const on = rate === r;
                return (
                  <Pressable key={r} onPress={() => setRate(r)} style={[styles.rate, { backgroundColor: on ? c.text : c.surfaceAlt }]}>
                    <Txt v="captionMedium" color={on ? c.background : c.text}>{r}×</Txt>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          {!open && (
            <View style={{ marginTop: space.m }}>
              <MaxLockCard reason="books" title={t('books.unlock')} sub={t('books.freeTaste', { n: LIMITS.freeBookChapters })} />
            </View>
          )}

          {/* about */}
          <Txt v="overline" color={c.textSecondary} style={{ marginTop: space.l, marginBottom: 6 }}>{t('books.about')}</Txt>
          <Txt v="body" color={c.text}>{ui === 'uk' ? book.about.uk : book.about.en}</Txt>

          {/* chapters */}
          <Txt v="overline" color={c.textSecondary} style={{ marginTop: space.l, marginBottom: 8 }}>
            {t('books.chapters', { n: list.length || book.chapters })}{progress ? ` · ${t('books.progress', { n: progress.done.length, total: list.length || book.chapters })}` : ''}
          </Txt>
          {chapters.isLoading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center', gap: 8 }}><ActivityIndicator color={c.textSecondary} /><Txt v="caption" color={c.textSecondary}>{t('books.loading')}</Txt></View>
          ) : chapters.isError ? (
            <View style={{ paddingVertical: 16, alignItems: 'center', gap: 10 }}>
              <Txt v="callout" color={c.textSecondary} center>{t('books.loadError')}</Txt>
              <Button title={t('books.retry')} variant="secondary" size="m" onPress={() => chapters.refetch()} />
            </View>
          ) : (
            <View style={[styles.list, { backgroundColor: c.surface, borderColor: c.divider }]}>
              {list.map((x, i) => {
                const can = chapterOpen(book.id, i, max);
                const active = ch === i && (isThis || !!progress);
                const done = progress?.done.includes(i);
                return (
                  <Pressable key={x.url} onPress={() => start(i)} style={[styles.row, { borderBottomColor: c.divider, borderBottomWidth: i === list.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
                    <View style={[styles.num, { backgroundColor: active ? c.accent : done ? c.successSoft : c.surfaceAlt }]}>
                      {active && playing ? <Pause size={13} color={c.onAccent} fill={c.onAccent} /> : done ? <Check size={14} color={c.success} /> : !can ? <Lock size={13} color={c.textTertiary} /> : <Txt v="captionMedium" color={active ? c.onAccent : c.textSecondary}>{i + 1}</Txt>}
                    </View>
                    <Txt v="callout" numberOfLines={2} style={{ flex: 1, opacity: can ? 1 : 0.5 }} color={active ? c.accent : c.text}>{x.title}</Txt>
                    {x.seconds ? <Txt v="caption" color={c.textTertiary}>{fmtTime(x.seconds)}</Txt> : null}
                  </Pressable>
                );
              })}
            </View>
          )}
          <Txt v="caption" color={c.textTertiary} center style={{ marginTop: space.l }}>{t('books.credit')}</Txt>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,.35)', alignItems: 'center', justifyContent: 'center' },
  coverShadow: { borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  player: { marginTop: space.l, padding: 16, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 36, marginTop: 10 },
  bigPlay: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  rates: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  rate: { paddingHorizontal: 10, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  list: { borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  num: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
