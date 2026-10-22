import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Headphones, Pause, Play, X } from './icons';
import { Txt, PressableScale } from './ui';
import { useTheme, fonts, radius } from '../theme/tokens';
import { useT } from '../i18n';
import { BOOKS, bookById, type Level } from '../data/audiobooks';
import { stopBook, togglePlay, usePlayer } from '../lib/player';
import { unsplash } from '../data/photos';
import { BOOK_ART } from '../data/bookArt';
import { EmojiArt } from './NoteBits';

export const BOOKS_BANNER = unsplash('photo-1758539412456-b26bed4e685d', 1200); // Mario Azzi, Unsplash License
export const BOOKS_HERO = unsplash('photo-1644900250658-a692865fa77f', 1200); // Raman, Unsplash License

const LEVEL_COLORS: Record<Level, [string, string]> = { A2: ['#2F9E44', '#D3F9D8'], B1: ['#1C7ED6', '#D0EBFF'], B2: ['#AE3EC9', '#F3D9FA'], C1: ['#E8590C', '#FFE8CC'] };

export function LevelBadge({ level, small }: { level: Level; small?: boolean }) {
  const [fg, bg] = LEVEL_COLORS[level];
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: small ? 6 : 8, paddingVertical: small ? 1 : 3, borderRadius: 999, alignSelf: 'flex-start' }}>
      <Txt v="caption" color={fg} style={{ fontFamily: fonts.semibold, fontSize: small ? 10 : 12 }}>{level}</Txt>
    </View>
  );
}

/** Book cover: our own illustrated cover (emoji + colours per book), so every book looks different and it works offline. */
export function BookCover({ id, width, radiusPx = 14 }: { id: string; width: number; radiusPx?: number }) {
  const b = bookById(id);
  const [emoji, from, to] = BOOK_ART[id] ?? ['📖', '#5B6CF0', '#141A5E'];
  const small = width < 70;
  return (
    <View style={{ width, height: width, borderRadius: radiusPx, overflow: 'hidden' }}>
      <LinearGradient colors={[from, to]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', width: width * 0.9, height: width * 0.9, borderRadius: width, backgroundColor: 'rgba(255,255,255,0.12)', top: -width * 0.25, right: -width * 0.3 }} />
      <View style={{ position: 'absolute', top: small ? width * 0.18 : width * 0.1, right: small ? width * 0.18 : width * 0.08 }}>
        <EmojiArt emoji={emoji} size={small ? width * 0.62 : width * 0.42} />
      </View>
      {!small && (
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: width * 0.07 }}>
          <Txt numberOfLines={3} style={{ fontFamily: fonts.serif, fontSize: Math.max(13, width / 8.5), lineHeight: Math.max(16, width / 7.4), color: '#fff' }}>{b?.title}</Txt>
          <Txt numberOfLines={1} v="caption" color="rgba(255,255,255,.8)" style={{ fontSize: Math.max(9, width / 17) }}>{b?.author}</Txt>
        </View>
      )}
    </View>
  );
}

/** Big photo banner on the Learn screen. */
export function AudiobooksBanner() {
  const { t } = useT();
  const narrow = useWindowDimensions().width < 360;
  if (!BOOKS.length) return null;
  return (
    <PressableScale onPress={() => router.push('/books')} style={{ borderRadius: 24, overflow: 'hidden', height: 178 }}>
      <Image source={{ uri: BOOKS_BANNER }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} placeholder={{ blurhash: 'L57,_nWB0Kxu~qWVM{t7xuj[ofWB' }} />
      <LinearGradient colors={['rgba(8,20,40,0.05)', 'rgba(8,20,40,0.55)', 'rgba(8,20,40,0.92)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, justifyContent: 'flex-end', padding: 18 }}>
        <View style={styles.pill}>
          <Headphones size={13} color="#0B1B33" />
          <Txt v="caption" color="#0B1B33" style={{ fontFamily: fonts.semibold }}>A2 · B1 · B2 · C1</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Txt numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.serif, fontSize: narrow ? 28 : 34, lineHeight: narrow ? 32 : 38, color: '#fff' }}>{t('books.bannerTitle')}</Txt>
            <Txt v="caption" color="rgba(255,255,255,.85)">{t('books.bannerSub')}</Txt>
          </View>
          <View style={styles.cta}>
            <Play size={15} color="#0B1B33" fill="#0B1B33" />
            <Txt v="captionMedium" color="#0B1B33">{t('books.bannerCta')}</Txt>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

/** Floating mini player above the tab bar while a book is playing. */
export function MiniPlayer({ dark }: { dark?: boolean }) {
  const { c } = useTheme();
  const bookId = usePlayer((s) => s.bookId);
  const chapter = usePlayer((s) => s.chapter);
  const chapters = usePlayer((s) => s.chapters);
  const playing = usePlayer((s) => s.playing);
  const buffering = usePlayer((s) => s.buffering);
  const time = usePlayer((s) => s.time);
  const duration = usePlayer((s) => s.duration);
  if (!bookId) return null;
  const b = bookById(bookId);
  const bg = dark ? 'rgba(20,20,20,0.92)' : c.surface;
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} exiting={FadeOutDown} style={[styles.mini, { backgroundColor: bg, borderColor: c.divider }]}>
      <Pressable onPress={() => router.push({ pathname: '/books/[id]', params: { id: bookId } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <BookCover id={bookId} width={40} radiusPx={9} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt v="captionMedium" numberOfLines={1} color={dark ? '#fff' : c.text}>{b?.title}</Txt>
          <Txt v="caption" numberOfLines={1} color={dark ? 'rgba(255,255,255,.65)' : c.textSecondary}>{chapters[chapter]?.title}</Txt>
        </View>
      </Pressable>
      <Pressable onPress={togglePlay} hitSlop={8} style={[styles.miniBtn, { backgroundColor: c.accent }]} accessibilityLabel={playing ? 'pause' : 'play'}>
        {buffering ? <ActivityIndicator size="small" color={c.onAccent} /> : playing ? <Pause size={18} color={c.onAccent} fill={c.onAccent} /> : <Play size={18} color={c.onAccent} fill={c.onAccent} />}
      </Pressable>
      <Pressable onPress={stopBook} hitSlop={8} accessibilityLabel="close"><X size={18} color={dark ? '#fff' : c.textSecondary} /></Pressable>
      <View style={[styles.miniTrack, { backgroundColor: c.divider }]}>
        <View style={{ width: `${duration ? Math.min(100, (time / duration) * 100) : 0}%`, height: '100%', backgroundColor: c.accent }} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#FFD66B', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', height: 38, paddingHorizontal: 14, borderRadius: 19 },
  mini: { position: 'absolute', left: 10, right: 10, bottom: '100%', marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, paddingRight: 14, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  miniBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  miniTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 },
});
