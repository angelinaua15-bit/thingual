import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Camera } from 'lucide-react-native';
import { Avatar, Button, Txt, Segmented } from './ui';
import { PostCard } from './PostCard';
import { toast } from './Overlay';
import { useTheme, fonts, space } from '../theme/tokens';
import { useT, languageName } from '../i18n';
import { follow, followingIds, getProfile, unfollow, updateProfile, uploadImage, userPosts, type Profile } from '../lib/api';
import { useLikedSet, useNet } from '../lib/queries';
import { pickImage } from '../lib/pickImage';
import { haptic } from '../lib/feedback';
import { LangCode } from '../data/languages';
import { useApp } from '../store/useApp';

/** Threads-style profile header + posts/replies tabs. Used for "Me" and other users. */
export function ProfileView({ uid, header, footer }: { uid: string; header?: React.ReactNode; footer?: React.ReactNode }) {
  const { c } = useTheme();
  const { t } = useT();
  const qc = useQueryClient();
  const me = useNet((s) => s.uid);
  const ui = useApp((s) => s.settings.uiLang);
  const isMe = me === uid;
  const [tab, setTab] = useState<'posts' | 'replies'>('posts');
  const [uploading, setUploading] = useState(false);

  const profile = useQuery({ queryKey: ['profile', uid], queryFn: () => getProfile(uid) });
  const myFollowing = useQuery({ queryKey: ['followingIds', me], queryFn: () => followingIds(), enabled: !!me });
  const theirFollowing = useQuery({ queryKey: ['followingIds', uid], queryFn: () => followingIds(uid), enabled: !isMe });
  const posts = useQuery({ queryKey: ['userPosts', uid, tab], queryFn: () => userPosts(uid, tab === 'replies') });
  const liked = useLikedSet(posts.data);

  const p = profile.data;
  const iFollow = !!myFollowing.data?.includes(uid);
  const followsMe = !!me && !!theirFollowing.data?.includes(me);

  const toggleFollow = async () => {
    haptic.light();
    const ids = myFollowing.data ?? [];
    qc.setQueryData(['followingIds', me], iFollow ? ids.filter((x) => x !== uid) : [...ids, uid]);
    qc.setQueryData<Profile | null>(['profile', uid], (old) => (old ? { ...old, followers_count: old.followers_count + (iFollow ? -1 : 1) } : old));
    try {
      if (iFollow) await unfollow(uid);
      else await follow(uid);
      qc.invalidateQueries({ queryKey: ['feed'] });
    } catch {
      toast(t('social.offline'), 'default');
      qc.invalidateQueries({ queryKey: ['followingIds', me] });
      qc.invalidateQueries({ queryKey: ['profile', uid] });
    }
  };

  const changeAvatar = async () => {
    if (!isMe) return;
    const uri = await pickImage({ square: true, max: 600 });
    if (!uri) return;
    setUploading(true);
    try {
      const url = await uploadImage('avatars', uri);
      const updated = await updateProfile({ avatar_url: url });
      qc.setQueryData(['profile', uid], updated);
      qc.setQueryData(['me'], updated);
      qc.invalidateQueries({ queryKey: ['feed'] });
      haptic.success();
    } catch {
      toast(t('social.offline'), 'default');
    } finally {
      setUploading(false);
    }
  };

  if (profile.isLoading) return <ActivityIndicator style={{ marginTop: 60 }} color={c.textSecondary} />;
  if (!p) return <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 60 }}>{t('social.offline')}</Txt>;

  return (
    <View>
      {header}
      <Animated.View entering={FadeIn.duration(400)} style={{ paddingHorizontal: space.m }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontFamily: fonts.serif, fontSize: 34, lineHeight: 38, color: c.text }} numberOfLines={2}>{p.name || p.handle}</Txt>
            <Txt v="callout" color={c.textSecondary} style={{ marginTop: 2 }}>@{p.handle}</Txt>
          </View>
          <Pressable onPress={changeAvatar} disabled={!isMe} accessibilityLabel={t('social.changePhoto')}>
            <Avatar seed={p.id} size={84} label={p.name || p.handle} uri={p.avatar_url} />
            {isMe && (
              <View style={[styles.camBadge, { backgroundColor: c.text, borderColor: c.background }]}>
                {uploading ? <ActivityIndicator size="small" color={c.background} /> : <Camera size={14} color={c.background} />}
              </View>
            )}
          </Pressable>
        </View>
        {p.bio ? <Txt v="body" style={{ marginTop: 12 }}>{p.bio}</Txt> : null}
        {(p.native_lang || p.learning_lang) && (
          <Txt v="caption" color={c.textSecondary} style={{ marginTop: 8 }}>
            {[p.native_lang && languageName(p.native_lang as LangCode, ui), p.learning_lang && `→ ${languageName(p.learning_lang as LangCode, ui)}`].filter(Boolean).join(' ')}
          </Txt>
        )}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, alignItems: 'center' }}>
          <Pressable onPress={() => router.push({ pathname: '/people', params: { uid, kind: 'followers' } })}>
            <Txt v="callout" color={c.textSecondary}><Txt v="bodyMedium">{p.followers_count}</Txt> {t('social.followers')}</Txt>
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/people', params: { uid, kind: 'following' } })}>
            <Txt v="callout" color={c.textSecondary}><Txt v="bodyMedium">{p.following_count}</Txt> {t('social.followingCount')}</Txt>
          </Pressable>
          {!isMe && iFollow && followsMe && (
            <View style={[styles.mutual, { backgroundColor: c.accentSoft }]}>
              <Txt v="captionMedium" color={c.accent}>{t('social.mutual')}</Txt>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          {isMe ? (
            <Button title={t('social.editProfile')} variant="secondary" size="m" style={{ flex: 1 }} onPress={() => router.push('/edit-profile')} />
          ) : (
            <Button
              title={iFollow ? t('social.following') : followsMe ? t('social.followBack') : t('social.follow')}
              variant={iFollow ? 'secondary' : 'primary'}
              size="m"
              style={{ flex: 1 }}
              onPress={toggleFollow}
            />
          )}
          <Button
            title={t('social.shareProfile')}
            variant="secondary"
            size="m"
            style={{ flex: 1 }}
            onPress={() => Share.share({ message: t('social.inviteText', { handle: p.handle, link: `https://thingual.vercel.app/user/${p.id}` }) })}
          />
        </View>
      </Animated.View>
      {footer}
      <View style={{ paddingHorizontal: space.m, marginTop: 18 }}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'posts', label: t('social.posts') }, { value: 'replies', label: t('social.replies') }]} />
      </View>
      <View style={{ paddingHorizontal: space.m }}>
        {posts.isLoading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={c.textSecondary} />
        ) : posts.data?.length ? (
          posts.data.map((post, i) => <PostCard key={post.id} post={post} i={i} liked={liked.has(post.id)} />)
        ) : (
          <Animated.View entering={FadeInDown}>
            <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 30 }}>{t('social.noPosts')}</Txt>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  camBadge: { position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  mutual: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
});
