import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Play } from '../../src/components/icons';
import { Txt, Chip, PressableScale, ProgressBar } from '../../src/components/ui';
import { BookCover, LevelBadge, BOOKS_HERO, MiniPlayer } from '../../src/components/BookBits';
import { MaxBadge, MaxLockCard } from '../../src/components/MaxLock';
import { useTheme, fonts, radius, space } from '../../src/theme/tokens';
import { useT, languageName } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { BOOKS, LEVELS, booksFor, bookById, type Level } from '../../src/data/audiobooks';
import { LIMITS, bookOpen, useIsMax } from '../../src/lib/premium';
import { goBack } from '../../src/lib/nav';
import { fmtMinutes } from '../../src/lib/audiobooks';
import type { LangCode } from '../../src/data/languages';

/** Library of audiobooks by level, in the language you learn. */
export default function Books() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = useApp((x) => x.settings);
  const progress = useApp((x) => x.books);
  const max = useIsMax();
  const langsWithBooks = useMemo(() => [...new Set(BOOKS.map((b) => b.lang))], []);
  const initial = (langsWithBooks.includes(s.active) ? s.active : s.targets.find((l) => langsWithBooks.includes(l)) ?? langsWithBooks[0]) as LangCode;
  const [lang, setLang] = useState<LangCode>(initial);
  const [level, setLevel] = useState<Level | 'all'>('all');
  const list = booksFor(lang).filter((b) => level === 'all' || b.level === level);
  const lockedCount = max ? 0 : booksFor(lang).filter((b) => !bookOpen(b.id, false)).length;

  const recent = Object.entries(progress)
    .filter(([id]) => bookById(id))
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0];
  const recentBook = recent ? bookById(recent[0]) : undefined;

  const contentW = Math.min(width, 760) - space.m * 2;
  const cols = contentW > 560 ? 3 : 2;
  const cardW = (contentW - (cols - 1) * 12) / cols;
  const otherLangs = [...new Set([...s.targets, ...langsWithBooks])].filter((l) => langsWithBooks.includes(l as LangCode)) as LangCode[];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        {/* hero photo */}
        <View style={{ height: 300 + insets.top }}>
          <Image source={{ uri: BOOKS_HERO }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient colors={['rgba(5,15,30,0.35)', 'rgba(5,15,30,0.15)', c.background]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
          <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16 }}>
            <Pressable onPress={() => goBack('/(tabs)/learn')} hitSlop={12} style={styles.back}><ArrowLeft size={20} color="#fff" /></Pressable>
          </View>
          <View style={{ position: 'absolute', left: space.m, right: space.m, bottom: 6, maxWidth: 728, alignSelf: 'center', width: '100%' }}>
            <Txt style={{ fontFamily: fonts.serif, fontSize: 48, lineHeight: 52, color: c.text }}>{t('books.title')}</Txt>
            <Txt v="headline" color={c.accent} style={{ fontSize: 17 }}>{t('books.tagline')}</Txt>
          </View>
        </View>

        <View style={{ paddingHorizontal: space.m, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
          <Txt v="callout" color={c.textSecondary} style={{ marginTop: 6 }}>{t('books.sub')}</Txt>

          {/* continue */}
          {recentBook && recent && (
            <Animated.View entering={FadeInDown.delay(60)}>
              <PressableScale onPress={() => router.push({ pathname: '/books/[id]', params: { id: recentBook.id } })} style={[styles.cont, { backgroundColor: c.ink }]}>
                <BookCover id={recentBook.id} width={64} radiusPx={12} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt v="overline" color={c.background} style={{ opacity: 0.6 }}>{t('books.continue')}</Txt>
                  <Txt v="bodyMedium" color={c.background} numberOfLines={1}>{recentBook.title}</Txt>
                  <View style={{ marginTop: 8 }}>
                    <ProgressBar value={(recent[1].done.length || 0) / Math.max(1, recentBook.chapters)} color={c.accent} track="rgba(127,127,127,.3)" />
                  </View>
                  <Txt v="caption" color={c.background} style={{ opacity: 0.7, marginTop: 4 }}>{t('books.progress', { n: recent[1].done.length, total: recentBook.chapters })}</Txt>
                </View>
                <View style={[styles.play, { backgroundColor: c.accent }]}><Play size={18} color={c.onAccent} fill={c.onAccent} /></View>
              </PressableScale>
            </Animated.View>
          )}

          {/* language + level */}
          {otherLangs.length > 1 && (
            <>
              <Txt v="overline" color={c.textSecondary} style={{ marginTop: space.l, marginBottom: 8 }}>{t('books.inLang')}</Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {otherLangs.map((l) => <Chip key={l} label={languageName(l, s.uiLang)} selected={lang === l} onPress={() => setLang(l)} />)}
              </ScrollView>
            </>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
            <Chip label={t('books.allLevels')} selected={level === 'all'} onPress={() => setLevel('all')} />
            {LEVELS.filter((l) => booksFor(lang).some((b) => b.level === l)).map((l) => (
              <Chip key={l} label={`${l} · ${t(`books.levels.${l}`)}`} selected={level === l} onPress={() => setLevel(l)} />
            ))}
          </ScrollView>

          {/* grid */}
          {list.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: space.m }}>
              {list.map((b, i) => {
                const open = bookOpen(b.id, max);
                const p = progress[b.id];
                return (
                  <Animated.View key={b.id} entering={FadeInDown.delay(Math.min(i, 8) * 45)} style={{ width: cardW }}>
                    <PressableScale onPress={() => router.push({ pathname: '/books/[id]', params: { id: b.id } })}>
                      <View>
                        <BookCover id={b.id} width={cardW} />
                        {!open && <View style={{ position: 'absolute', top: 8, right: 8 }}><MaxBadge size={24} /></View>}
                        <View style={{ position: 'absolute', left: 8, top: 8 }}><LevelBadge level={b.level} /></View>
                        {p && p.done.length > 0 ? (
                          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: 'rgba(0,0,0,.35)' }}>
                            <View style={{ width: `${Math.min(100, (p.done.length / b.chapters) * 100)}%`, height: 4, backgroundColor: c.accent }} />
                          </View>
                        ) : null}
                      </View>
                      <Txt v="bodyMedium" numberOfLines={2} style={{ marginTop: 8 }}>{b.title}</Txt>
                      <Txt v="caption" color={c.textSecondary} numberOfLines={1}>{b.author}</Txt>
                      <Txt v="caption" color={c.textTertiary}>{fmtMinutes(b.minutes, t)} · {t('books.chapters', { n: b.chapters })}</Txt>
                      {!open && <Txt v="caption" color="#8B5CF6" style={{ marginTop: 2 }}>{t('books.freeTaste', { n: LIMITS.freeBookChapters })}</Txt>}
                    </PressableScale>
                  </Animated.View>
                );
              })}
            </View>
          ) : (
            <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 30 }}>{t('books.empty')}</Txt>
          )}

          {lockedCount > 0 && (
            <View style={{ marginTop: space.l }}>
              <MaxLockCard reason="books" title={t('books.unlock')} sub={t('books.unlockSub', { n: LIMITS.freeBooksPerLang })} />
            </View>
          )}
          <Txt v="caption" color={c.textTertiary} center style={{ marginTop: space.l }}>{t('books.credit')}</Txt>
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 4 }}><MiniPlayer /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,.35)', alignItems: 'center', justifyContent: 'center' },
  cont: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.xl, marginTop: space.m },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
