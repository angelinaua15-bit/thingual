import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CornerLeftUp } from '../../src/components/icons';
import { Avatar, Txt } from '../../src/components/ui';
import { PostCard } from '../../src/components/PostCard';
import { useTheme, space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { getPost, getReplies } from '../../src/lib/api';
import { useLikedSet, useMe } from '../../src/lib/queries';

/** A thread: the post, then its replies; tap "Reply" to answer. */
export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const me = useMe().data;
  const post = useQuery({ queryKey: ['post', id], queryFn: () => getPost(id!), enabled: !!id });
  const replies = useQuery({ queryKey: ['replies', id], queryFn: () => getReplies(id!), enabled: !!id });
  const all = React.useMemo(() => [...(post.data ? [post.data] : []), ...(replies.data ?? [])], [post.data, replies.data]);
  const liked = useLikedSet(all);

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/map'))} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
        <Txt v="headline">{t('social.thread')}</Txt>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.m, paddingBottom: 120, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        {post.isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={c.textSecondary} />
        ) : !post.data ? (
          <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 40 }}>{t('social.offline')}</Txt>
        ) : (
          <>
            {post.data.parent_id && (
              <Pressable onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.data!.parent_id! } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <CornerLeftUp size={14} color={c.textSecondary} />
                <Txt v="captionMedium" color={c.textSecondary}>{t('social.thread')}</Txt>
              </Pressable>
            )}
            <PostCard post={post.data} liked={liked.has(post.data.id)} big onDeleted={() => router.back()} />
            {(replies.data ?? []).map((r, i) => (
              <PostCard key={r.id} post={r} i={i} liked={liked.has(r.id)} threadLine={i < (replies.data?.length ?? 0) - 1} />
            ))}
          </>
        )}
      </ScrollView>
      {post.data && (
        <Pressable onPress={() => router.push({ pathname: '/compose', params: { parent: post.data!.id } })} style={[styles.replyBar, { paddingBottom: insets.bottom + 10, backgroundColor: c.background, borderColor: c.divider }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
            <Avatar seed={me?.id ?? 'me'} size={32} label={me?.handle} uri={me?.avatar_url} />
            <View style={[styles.fakeInput, { backgroundColor: c.surfaceAlt }]}>
              <Txt v="callout" color={c.textTertiary}>{t('social.replyPlaceholder', { name: post.data.author.handle })}</Txt>
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 52, maxWidth: 640, width: '100%', alignSelf: 'center' },
  replyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  fakeInput: { flex: 1, height: 40, borderRadius: 999, justifyContent: 'center', paddingHorizontal: 16 },
});
