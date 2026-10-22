import { PhotoRejected } from '../src/lib/api';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { goBack } from '../src/lib/nav';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Camera, ImagePlus, MapPin, Tag, X } from '../src/components/icons';
import { Avatar, Txt, PressableScale } from '../src/components/ui';
import { Photo } from '../src/components/Photo';
import { ConceptPicker } from '../src/components/WordPeek';
import { toast } from '../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { createPost, getPost } from '../src/lib/api';
import { useMe } from '../src/lib/queries';
import { useDraft } from '../src/lib/draft';
import { pickImage } from '../src/lib/pickImage';
import { ensureCanPublish, getMyCity } from '../src/lib/publish';
import { fullWord } from '../src/data/concepts';
import { POST_TOPICS, type PostTopic } from '../src/lib/api';
import { haptic } from '../src/lib/feedback';

const MAX = 500;

/** Threads-style composer: text, optional photo, word tag and city. Also used for replies. */
export default function Compose() {
  const { parent, topic: topicParam } = useLocalSearchParams<{ parent?: string; topic?: PostTopic }>();
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const me = useMe().data;
  const s = useApp((x) => x.settings);
  const draft = useDraft();
  const [body, setBody] = useState('');
  const [topic, setTopic] = useState<PostTopic | null>(topicParam && POST_TOPICS.some((x) => x.id === topicParam) ? topicParam : null);
  const [photo, setPhoto] = useState<string | undefined>(draft.photo);
  const [concept, setConcept] = useState<string | undefined>(draft.concept);
  const [city, setCity] = useState<{ place: string; lat: number; lng: number } | null>(null);
  // new posts get the city automatically so they show up on the world map (remove it with ×)
  useEffect(() => {
    if (parent) return;
    let live = true;
    setLocating(true);
    getMyCity().then((r) => { if (live && r) setCity((c) => c ?? r); }).finally(() => live && setLocating(false));
    return () => { live = false; };
  }, []);
  const [locating, setLocating] = useState(false);
  const [picker, setPicker] = useState(false);
  const [posting, setPosting] = useState(false);
  const parentPost = useQuery({ queryKey: ['post', parent], queryFn: () => getPost(parent!), enabled: !!parent });

  useEffect(() => () => draft.clear(), []);

  const canPost = (body.trim().length > 0 || !!photo) && !posting;

  const submit = async () => {
    if (!canPost) return;
    if (!ensureCanPublish()) return;
    setPosting(true);
    try {
      const post = await createPost({
        body, photoUri: photo, concept_id: concept ?? null, lang: concept ? s.active : null, parent_id: parent ?? null,
        place: city?.place ?? null, lat: city?.lat ?? null, lng: city?.lng ?? null, topic: parent ? null : topic,
      });
      if (concept && photo) useApp.getState().saveWord(concept, post.photo_url ?? photo, 'camera');
      useApp.getState().unlock('first-post');
      qc.invalidateQueries();
      haptic.success();
      toast(t('social.posted'));
      goBack();
    } catch (e) {
      toast(e instanceof PhotoRejected ? t('safety.rejected') : t('social.offline'), 'default');
    } finally {
      setPosting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack()} hitSlop={12}><Txt v="body">{t('common.cancel')}</Txt></Pressable>
        <Txt v="bodyMedium" style={{ flex: 1, textAlign: 'center' }}>{parent ? t('social.reply') : t('social.newPost')}</Txt>
        <View style={{ width: 70 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.m, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        {parent && parentPost.data && (
          <View style={{ flexDirection: 'row', gap: 12, opacity: 0.85 }}>
            <View style={{ alignItems: 'center', width: 40 }}>
              <Avatar seed={parentPost.data.author_id} size={36} label={parentPost.data.author.handle} uri={parentPost.data.author.avatar_url} />
              <View style={{ width: 2, flex: 1, backgroundColor: c.divider, marginVertical: 6 }} />
            </View>
            <View style={{ flex: 1, paddingBottom: 16 }}>
              <Txt v="bodyMedium">{parentPost.data.author.name || parentPost.data.author.handle}</Txt>
              <Txt v="callout" color={c.textSecondary} numberOfLines={3}>{parentPost.data.body}</Txt>
              {parentPost.data.photo_url && <View style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', marginTop: 6 }}><Photo uri={parentPost.data.photo_url} style={{ width: '100%', height: '100%' }} /></View>}
            </View>
          </View>
        )}
        {!parent && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
            {POST_TOPICS.map((x) => {
              const on = topic === x.id;
              return (
                <Pressable key={x.id} onPress={() => { haptic.light(); setTopic(on ? null : x.id); }} style={[styles.topic, { backgroundColor: on ? c.text : c.surfaceAlt }]}>
                  <Txt v="captionMedium" color={on ? c.background : c.text}>{x.emoji} {t(`share.topics.${x.id}`)}</Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Avatar seed={me?.id ?? 'me'} size={40} label={me?.name || me?.handle} uri={me?.avatar_url} />
          <View style={{ flex: 1 }}>
            <Txt v="bodyMedium">{me?.name || me?.handle || t('social.you')}</Txt>
            <TextInput
              value={body}
              onChangeText={(v) => setBody(v.slice(0, MAX))}
              placeholder={parent && parentPost.data ? t('social.replyPlaceholder', { name: parentPost.data.author.handle }) : (topic ? t(`share.prompts.${topic}`) : t('social.composePlaceholder'))}
              placeholderTextColor={c.textTertiary}
              multiline
              autoFocus
              style={{ color: c.text, fontFamily: fonts.regular, fontSize: 17, lineHeight: 24, minHeight: 60, paddingVertical: 4, textAlignVertical: 'top' }}
            />
            {photo && (
              <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.photo}>
                <Photo uri={photo} style={{ width: '100%', height: '100%' }} />
                <Pressable onPress={() => setPhoto(undefined)} style={styles.remove} hitSlop={8}><X size={16} color="#fff" /></Pressable>
              </Animated.View>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {concept && (
                <Animated.View entering={FadeIn} style={[styles.chip, { backgroundColor: c.accentSoft }]}>
                  <Tag size={13} color={c.accent} />
                  <Txt v="captionMedium" color={c.accent}>{fullWord(concept, s.active)}</Txt>
                  <Pressable onPress={() => setConcept(undefined)} hitSlop={8}><X size={13} color={c.accent} /></Pressable>
                </Animated.View>
              )}
              {city && (
                <Animated.View entering={FadeIn} style={[styles.chip, { backgroundColor: c.surfaceAlt }]}>
                  <MapPin size={13} color={c.text} />
                  <Txt v="captionMedium">{city.place}</Txt>
                  <Pressable onPress={() => setCity(null)} hitSlop={8}><X size={13} color={c.text} /></Pressable>
                </Animated.View>
              )}
            </View>
            <View style={styles.tools}>
              <Pressable onPress={async () => { const u = await pickImage(); if (u) setPhoto(u); }} hitSlop={8}><ImagePlus size={22} color={c.textSecondary} /></Pressable>
              {Platform.OS !== 'web' && <Pressable onPress={async () => { const u = await pickImage({ camera: true }); if (u) setPhoto(u); }} hitSlop={8}><Camera size={22} color={c.textSecondary} /></Pressable>}
              <Pressable onPress={() => setPicker(true)} hitSlop={8}><Tag size={21} color={c.textSecondary} /></Pressable>
              <Pressable
                onPress={async () => {
                  setLocating(true);
                  const r = await getMyCity();
                  setLocating(false);
                  if (r) setCity(r);
                }}
                hitSlop={8}
              >
                {locating ? <ActivityIndicator size="small" color={c.textSecondary} /> : <MapPin size={21} color={c.textSecondary} />}
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10, borderColor: c.divider }]}>
        <Txt v="caption" color={body.length > MAX - 40 ? c.drop : c.textTertiary}>{body.length}/{MAX}</Txt>
        <PressableScale onPress={submit} style={[styles.post, { backgroundColor: canPost ? c.text : c.divider }]}>
          {posting ? <ActivityIndicator color={c.background} /> : <Txt v="bodyMedium" color={canPost ? c.background : c.textTertiary}>{t('social.post')}</Txt>}
        </PressableScale>
      </View>
      <ConceptPicker visible={picker} onClose={() => setPicker(false)} photo={photo} onPick={(id) => { setConcept(id); setPicker(false); }} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topic: { height: 34, paddingHorizontal: 12, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52, maxWidth: 640, width: '100%', alignSelf: 'center' },
  photo: { marginTop: 10, borderRadius: radius.m, overflow: 'hidden', width: '100%', aspectRatio: 1, maxWidth: 420 },
  remove: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 999 },
  tools: { flexDirection: 'row', gap: 22, marginTop: 14, alignItems: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  post: { paddingHorizontal: 20, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', minWidth: 110 },
});
