import React, { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { BookmarkPlus, Heart, MapPin, MessageCircle, MoreHorizontal, Send, Volume2 } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Txt, PressableScale } from './ui';
import { Photo } from './Photo';
import { Sheet, toast } from './Overlay';
import { useTheme, fonts, radius } from '../theme/tokens';
import { useT, languageName } from '../i18n';
import { useApp } from '../store/useApp';
import { fullWord, labelOf } from '../data/concepts';
import { LangCode, lang as langInfo } from '../data/languages';
import { haptic, speak, timeAgo, formatLate } from '../lib/feedback';
import { block, deletePost, report, setLike, type PostRow } from '../lib/api';
import { useNet } from '../lib/queries';

/** Threads-style post: avatar column, text, photo, word tag, actions. */
export function PostCard({ post, liked = false, i = 0, threadLine, big, onDeleted }: { post: PostRow; liked?: boolean; i?: number; threadLine?: boolean; big?: boolean; onDeleted?: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const qc = useQueryClient();
  const s = useApp((x) => x.settings);
  const saveWord = useApp((x) => x.saveWord);
  const uid = useNet((x) => x.uid);
  const [isLiked, setIsLiked] = useState(liked);
  const [likes, setLikes] = useState(post.like_count);
  const [menu, setMenu] = useState(false);
  const heart = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heart.value }] }));
  useEffect(() => setIsLiked(liked), [liked]);
  useEffect(() => setLikes(post.like_count), [post.like_count]);

  const mine = post.author_id === uid;
  const author = post.author;
  const wordLang = (post.lang ?? 'en') as LangCode;
  const label = post.concept_id ? labelOf(post.concept_id, wordLang) : undefined;

  const toggleLike = async () => {
    const next = !isLiked;
    setIsLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    heart.value = withSequence(withSpring(1.35, { damping: 6 }), withSpring(1));
    haptic.light();
    try {
      await setLike(post.id, next);
    } catch {
      setIsLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
      toast(t('social.offline'), 'default');
    }
  };

  const openUser = () => router.push({ pathname: '/user/[id]', params: { id: post.author_id } });
  const open = () => router.push({ pathname: '/post/[id]', params: { id: post.id } });

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(i, 8) * 50).duration(400)} style={[styles.wrap, !threadLine && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.divider }]}>
      <View style={{ alignItems: 'center', width: 44 }}>
        <Pressable onPress={openUser}>
          <Avatar seed={post.author_id} size={40} label={author?.name || author?.handle} uri={author?.avatar_url} />
        </Pressable>
        {threadLine && <View style={[styles.line, { backgroundColor: c.divider }]} />}
      </View>
      <View style={{ flex: 1, paddingBottom: 14 }}>
        <View style={styles.head}>
          <Pressable onPress={openUser} style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Txt v="bodyMedium" numberOfLines={1} style={{ flexShrink: 1 }}>{author?.name || author?.handle}</Txt>
            <Txt v="caption" color={c.textTertiary} numberOfLines={1}>@{author?.handle}</Txt>
          </Pressable>
          <Txt v="caption" color={c.textTertiary}>· {timeAgo(new Date(post.created_at).getTime(), t).replace(/ ago| тому/, '')}</Txt>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setMenu(true)} hitSlop={10}>
            <MoreHorizontal size={18} color={c.textTertiary} />
          </Pressable>
        </View>

        <Pressable onPress={open}>
          {(post.is_drop || post.place) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {post.is_drop && (
                <View style={[styles.dropTag, { backgroundColor: c.drop }]}>
                  <Txt v="captionMedium" color="#fff" style={{ fontSize: 10 }}>DROP</Txt>
                </View>
              )}
              {post.place ? (
                <>
                  <MapPin size={12} color={c.textTertiary} />
                  <Txt v="caption" color={c.textTertiary} style={{ fontSize: 12 }}>{post.place}</Txt>
                </>
              ) : null}
              {post.late_minutes ? <Txt v="caption" color={c.drop} style={{ fontSize: 12 }}>· {t('drop.late', { t: formatLate(post.late_minutes, t) })}</Txt> : null}
            </View>
          )}
          {post.body ? <Txt v={big ? 'bodyMedium' : 'body'} style={{ fontSize: big ? 17 : 15.5, lineHeight: big ? 24 : 22 }}>{post.body}</Txt> : null}
          {post.photo_url ? (
            <View style={[styles.photo, { marginTop: post.body ? 10 : 2, aspectRatio: big ? 4 / 5 : 1 }]}>
              <Photo uri={post.photo_url} style={{ width: '100%', height: '100%' }} />
            </View>
          ) : null}
        </Pressable>

        {label && post.concept_id ? (
          <View style={[styles.word, { backgroundColor: c.surfaceAlt }]}>
            <Pressable onPress={() => speak(label.word, wordLang)} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flex: 1, flexWrap: 'wrap' }}>
              <Txt style={{ fontFamily: fonts.serif, fontSize: 22, color: c.text, writingDirection: langInfo(wordLang).rtl ? 'rtl' : 'ltr' }}>{label.word}</Txt>
              <Txt v="caption" color={c.textSecondary}>{label.roman ? `${label.roman} · ` : ''}{languageName(wordLang, s.uiLang)}</Txt>
              <Volume2 size={13} color={c.textTertiary} />
            </Pressable>
            <PressableScale
              onPress={() => {
                const ok = saveWord(post.concept_id!, post.photo_url ?? '', 'world');
                haptic.success();
                toast(ok ? t('word.savedToast') : t('word.alreadySaved'));
              }}
              style={[styles.learn, { backgroundColor: c.accentSoft }]}
            >
              <BookmarkPlus size={14} color={c.accent} />
              <Txt v="captionMedium" color={c.accent} numberOfLines={1}>{fullWord(post.concept_id, s.active)}</Txt>
            </PressableScale>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable onPress={toggleLike} hitSlop={8} style={styles.action}>
            <Animated.View style={heartStyle}>
              <Heart size={20} color={isLiked ? c.error : c.text} fill={isLiked ? c.error : 'transparent'} />
            </Animated.View>
            {likes > 0 && <Txt v="caption" color={c.textSecondary}>{likes}</Txt>}
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/compose', params: { parent: post.id } })} hitSlop={8} style={styles.action}>
            <MessageCircle size={20} color={c.text} />
            {post.reply_count > 0 && <Txt v="caption" color={c.textSecondary}>{post.reply_count}</Txt>}
          </Pressable>
          <Pressable onPress={() => Share.share({ message: `${post.body ? `${post.body}\n` : ''}https://thingual.vercel.app/post/${post.id}` })} hitSlop={8} style={styles.action}>
            <Send size={19} color={c.text} />
          </Pressable>
        </View>
      </View>

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          {mine ? (
            <Pressable
              style={[styles.menuItem, { backgroundColor: c.errorSoft }]}
              onPress={async () => {
                setMenu(false);
                await deletePost(post.id).catch(() => toast(t('social.offline'), 'default'));
                toast(t('social.deleted'));
                qc.invalidateQueries();
                onDeleted?.();
              }}
            >
              <Txt v="bodyMedium" color={c.error}>{t('social.delete')}</Txt>
            </Pressable>
          ) : (
            <>
              <Pressable style={[styles.menuItem, { backgroundColor: c.surfaceAlt }]} onPress={async () => { setMenu(false); await report(post.id).catch(() => {}); toast(t('map.reported')); }}>
                <Txt v="bodyMedium">{t('map.report')}</Txt>
              </Pressable>
              <Pressable style={[styles.menuItem, { backgroundColor: c.errorSoft }]} onPress={async () => { setMenu(false); await block(post.author_id).catch(() => {}); toast(t('map.blocked')); qc.invalidateQueries(); }}>
                <Txt v="bodyMedium" color={c.error}>{t('map.block')} @{author?.handle}</Txt>
              </Pressable>
            </>
          )}
        </View>
      </Sheet>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 12, paddingTop: 14 },
  line: { width: 2, flex: 1, marginTop: 6, borderRadius: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  dropTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  photo: { borderRadius: radius.m, overflow: 'hidden', maxHeight: 460, width: '100%' },
  word: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingLeft: 12, paddingRight: 6, paddingVertical: 6, borderRadius: radius.s },
  learn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 30, borderRadius: 999, maxWidth: 170 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 10 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  menuItem: { height: 52, borderRadius: radius.s, paddingHorizontal: 16, justifyContent: 'center' },
});
