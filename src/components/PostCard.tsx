import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { BookmarkPlus, MoreHorizontal, Volume2 } from 'lucide-react-native';
import { Avatar, Txt, PressableScale } from './ui';
import { Photo } from './Photo';
import { Sheet, toast } from './Overlay';
import { useTheme, fonts, radius } from '../theme/tokens';
import { useT, languageName } from '../i18n';
import { useApp } from '../store/useApp';
import { Post, REACTIONS } from '../data/social';
import { fullWord, labelOf } from '../data/concepts';
import { lang } from '../data/languages';
import { haptic, speak, timeAgo, formatLate } from '../lib/feedback';

const NONE: string[] = [];

export function PostCard({ post, i = 0, compact }: { post: Post; i?: number; compact?: boolean }) {
  const { c } = useTheme();
  const { t } = useT();
  const s = useApp((x) => x.settings);
  const mine = useApp((x) => x.reactions[post.id]) ?? NONE;
  const react = useApp((x) => x.react);
  const saveWord = useApp((x) => x.saveWord);
  const report = useApp((x) => x.report);
  const block = useApp((x) => x.block);
  const [menu, setMenu] = useState(false);
  const authorWord = labelOf(post.concept, post.authorLang)!;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(i, 8) * 60).duration(450)} style={{ marginBottom: 22 }}>
      <View style={styles.head}>
        <Avatar seed={post.authorId} size={34} label={post.author} />
        <View style={{ flex: 1 }}>
          <Txt v="captionMedium">{post.author}</Txt>
          <Txt v="caption" color={c.textSecondary} style={{ fontSize: 12 }}>
            {[post.place, timeAgo(post.createdAt, t)].filter(Boolean).join(' · ')}
            {post.lateMinutes ? ` · ${t('drop.late', { t: formatLate(post.lateMinutes, t) })}` : ''}
          </Txt>
        </View>
        {!post.mine && (
          <Pressable onPress={() => setMenu(true)} hitSlop={10}>
            <MoreHorizontal size={20} color={c.textSecondary} />
          </Pressable>
        )}
      </View>
      <Pressable onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}>
        <View style={{ aspectRatio: compact ? 1 : 4 / 5, borderRadius: radius.l, overflow: 'hidden' }}>
          <Photo uri={post.photo} style={{ width: '100%', height: '100%' }} />
          {post.isDrop && (
            <View style={[styles.dropTag, { backgroundColor: c.drop }]}>
              <Txt v="captionMedium" color="#fff" style={{ fontSize: 11 }}>DROP</Txt>
            </View>
          )}
        </View>
      </Pressable>
      <View style={styles.wordRow}>
        <Pressable onPress={() => speak(authorWord.word, post.authorLang)} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flex: 1, flexWrap: 'wrap' }}>
          <Txt style={{ fontFamily: fonts.serif, fontSize: 26, color: c.text, writingDirection: lang(post.authorLang).rtl ? 'rtl' : 'ltr' }}>{authorWord.word}</Txt>
          <Txt v="caption" color={c.textSecondary}>{authorWord.roman ? `${authorWord.roman} · ` : ''}{languageName(post.authorLang, s.uiLang)}</Txt>
          <Volume2 size={14} color={c.textTertiary} />
        </Pressable>
        <PressableScale
          onPress={() => {
            const ok = saveWord(post.concept, post.photo, 'world');
            haptic.success();
            toast(ok ? t('word.savedToast') : t('word.alreadySaved'));
          }}
          style={[styles.learn, { backgroundColor: c.accentSoft }]}
        >
          <BookmarkPlus size={16} color={c.accent} />
          <Txt v="captionMedium" color={c.accent}>{fullWord(post.concept, s.active)}</Txt>
        </PressableScale>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {REACTIONS.map((r) => {
          const on = mine.includes(r.type);
          return (
            <PressableScale key={r.type} onPress={() => react(post.id, r.type)} style={[styles.reaction, { backgroundColor: on ? c.text : c.surface, borderColor: on ? c.text : c.divider }]}>
              {on ? <Animated.Text entering={ZoomIn} style={{ color: c.background, fontSize: 13 }}>{r.emoji}</Animated.Text> : <Txt style={{ fontSize: 13, color: c.textSecondary }}>{r.emoji}</Txt>}
              <Txt v="caption" color={on ? c.background : c.textSecondary} style={{ fontSize: 12 }}>{t(`map.reactions.${r.type}`)}</Txt>
            </PressableScale>
          );
        })}
      </View>
      {post.credit && <Txt v="caption" color={c.textTertiary} style={{ marginTop: 8, fontSize: 11 }}>{t('map.photoBy', { name: post.credit })}</Txt>}

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          <Pressable style={[styles.menuItem, { backgroundColor: c.surfaceAlt }]} onPress={() => { report(post.id); setMenu(false); toast(t('map.reported')); }}>
            <Txt v="bodyMedium">{t('map.report')}</Txt>
          </Pressable>
          <Pressable style={[styles.menuItem, { backgroundColor: c.errorSoft }]} onPress={() => { block(post.authorId); setMenu(false); toast(t('map.blocked')); }}>
            <Txt v="bodyMedium" color={c.error}>{t('map.block')}</Txt>
          </Pressable>
        </View>
      </Sheet>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  dropTag: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  learn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 999 },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 30, borderRadius: 999, borderWidth: 1 },
  menuItem: { height: 52, borderRadius: radius.s, paddingHorizontal: 16, justifyContent: 'center' },
});
