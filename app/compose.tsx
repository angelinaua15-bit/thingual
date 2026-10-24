import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { ImagePlus, SpellCheck, X } from '../src/components/icons';
import { Avatar, Txt, PressableScale } from '../src/components/ui';
import { Photo } from '../src/components/Photo';
import { toast } from '../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT, languageName } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { createPost, getPost, PhotoRejected, PhotoUnchecked, POST_TOPICS, type PostTopic } from '../src/lib/api';
import { useMe } from '../src/lib/queries';
import { pickImage } from '../src/lib/pickImage';
import { ensureCanPublish } from '../src/lib/publish';
import { promptOfDay } from '../src/data/prompts';
import type { LangCode } from '../src/data/languages';
import { haptic } from '../src/lib/feedback';
import { goBack } from '../src/lib/nav';

const MAX = 500;

/**
 * Threads composer. A new thread is written in a language (usually the one you learn) and tagged with a topic;
 * a reply can be a plain answer or a correction of the parent's text.
 */
export default function Compose() {
  const { parent, topic: topicParam, correct, prompt } = useLocalSearchParams<{ parent?: string; topic?: PostTopic; correct?: string; prompt?: string }>();
  const { c } = useTheme();
  const { t, code } = useT();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const me = useMe().data;
  const s = useApp((x) => x.settings);
  const today = promptOfDay();
  const langs = useMemo(() => [...new Set<LangCode>([s.active, ...s.targets, s.native])], [s.active, s.targets, s.native]);
  const [postLang, setPostLang] = useState<LangCode>(s.active);
  const [topic, setTopic] = useState<PostTopic | null>(topicParam && POST_TOPICS.some((x) => x.id === topicParam) ? topicParam : prompt ? 'practice' : null);
  const [body, setBody] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [posting, setPosting] = useState(false);
  const isCorrection = !!parent && correct === '1';
  const parentPost = useQuery({ queryKey: ['post', parent], queryFn: () => getPost(parent!), enabled: !!parent });

  // a correction starts from the original text, so you only change what's wrong
  useEffect(() => {
    if (isCorrection && parentPost.data && !body) setBody(parentPost.data.body);
  }, [isCorrection, parentPost.data]);

  const changed = !isCorrection || (parentPost.data && body.trim() !== parentPost.data.body.trim());
  const canPost = (body.trim().length > 0 || !!photo) && !posting && !!changed;

  const submit = async () => {
    if (!canPost) return;
    if (!ensureCanPublish()) return;
    setPosting(true);
    try {
      const text = isCorrection && note.trim() ? `${body.trim()}\n\n${note.trim()}` : body;
      await createPost({
        body: text,
        photoUri: photo,
        parent_id: parent ?? null,
        lang: parent ? parentPost.data?.lang ?? postLang : postLang,
        level: parent ? null : s.cefr ?? null,
        topic: parent ? null : topic,
        kind: isCorrection ? 'correction' : 'post',
        quote: isCorrection ? parentPost.data?.body ?? null : null,
      });
      useApp.getState().unlock('first-post');
      qc.invalidateQueries();
      haptic.success();
      toast(isCorrection ? t('threads.correctionSent') : t('social.posted'));
      goBack();
    } catch (e) {
      toast(e instanceof PhotoRejected ? t('safety.rejected') : e instanceof PhotoUnchecked ? t('safety.unchecked') : t('social.offline'), 'default');
    } finally {
      setPosting(false);
    }
  };

  const placeholder = isCorrection
    ? ''
    : parent && parentPost.data
      ? t('social.replyPlaceholder', { name: parentPost.data.author.handle })
      : prompt
        ? t('threads.promptPlaceholder', { lang: languageName(postLang, s.uiLang) })
        : topic ? t(`threads.prompts.${topic}`, { lang: languageName(postLang, s.uiLang) }) : t('threads.placeholder', { lang: languageName(postLang, s.uiLang) });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack()} hitSlop={12}><Txt v="body">{t('common.cancel')}</Txt></Pressable>
        <Txt v="bodyMedium" style={{ flex: 1, textAlign: 'center' }}>{isCorrection ? t('threads.correct') : parent ? t('social.reply') : t('threads.new')}</Txt>
        <View style={{ width: 70 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.m, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        {parent && parentPost.data && !isCorrection && (
          <View style={{ flexDirection: 'row', gap: 12, opacity: 0.85 }}>
            <View style={{ alignItems: 'center', width: 40 }}>
              <Avatar seed={parentPost.data.author_id} size={36} label={parentPost.data.author.handle} uri={parentPost.data.author.avatar_url} />
              <View style={{ width: 2, flex: 1, backgroundColor: c.divider, marginVertical: 6 }} />
            </View>
            <View style={{ flex: 1, paddingBottom: 16 }}>
              <Txt v="bodyMedium">{parentPost.data.author.name || parentPost.data.author.handle}</Txt>
              <Txt v="callout" color={c.textSecondary} numberOfLines={3}>{parentPost.data.body}</Txt>
            </View>
          </View>
        )}

        {isCorrection && parentPost.data && (
          <View style={[styles.quote, { backgroundColor: c.surfaceAlt }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <SpellCheck size={15} color={c.textSecondary} />
              <Txt v="overline" color={c.textSecondary}>{t('threads.original', { name: parentPost.data.author.handle })}</Txt>
            </View>
            <Txt v="callout" style={{ marginTop: 6 }}>{parentPost.data.body}</Txt>
            <Txt v="caption" color={c.textTertiary} style={{ marginTop: 8 }}>{t('threads.correctHint')}</Txt>
          </View>
        )}

        {!parent && (
          <>
            {prompt ? (
              <View style={[styles.quote, { backgroundColor: c.accentSoft }]}>
                <Txt v="overline" color={c.accent}>{t('threads.today')}</Txt>
                <Txt v="bodyMedium" style={{ marginTop: 4 }}>{code === 'uk' ? today.uk : today.en}</Txt>
              </View>
            ) : null}
            <Txt v="overline" color={c.textSecondary} style={{ marginBottom: 8 }}>{t('threads.writeIn')}</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
              {langs.map((l) => {
                const on = postLang === l;
                return (
                  <Pressable key={l} onPress={() => { haptic.light(); setPostLang(l); }} style={[styles.chip, { backgroundColor: on ? c.text : c.surfaceAlt }]}>
                    <Txt v="captionMedium" color={on ? c.background : c.text}>{languageName(l, s.uiLang)}</Txt>
                  </Pressable>
                );
              })}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
              {POST_TOPICS.map((x) => {
                const on = topic === x.id;
                return (
                  <Pressable key={x.id} onPress={() => { haptic.light(); setTopic(on ? null : x.id); }} style={[styles.chip, { backgroundColor: on ? c.accent : c.surfaceAlt }]}>
                    <Txt v="captionMedium" color={on ? c.onAccent : c.text}>{x.emoji} {t(`threads.topics.${x.id}`)}</Txt>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Avatar seed={me?.id ?? 'me'} size={40} label={me?.name || me?.handle} uri={me?.avatar_url} />
          <View style={{ flex: 1 }}>
            <Txt v="bodyMedium">{me?.name || me?.handle || t('social.you')}</Txt>
            <TextInput
              value={body}
              onChangeText={(v) => setBody(v.slice(0, MAX))}
              placeholder={placeholder}
              placeholderTextColor={c.textTertiary}
              multiline
              autoFocus
              style={[styles.input, { color: c.text }, isCorrection && { backgroundColor: c.successSoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }]}
            />
            {isCorrection && (
              <TextInput
                value={note}
                onChangeText={(v) => setNote(v.slice(0, 200))}
                placeholder={t('threads.whyPlaceholder')}
                placeholderTextColor={c.textTertiary}
                multiline
                style={[styles.input, { color: c.text, fontSize: 15, minHeight: 40, marginTop: 10 }]}
              />
            )}
            {photo && (
              <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.photo}>
                <Photo uri={photo} style={{ width: '100%', height: '100%' }} />
                <Pressable onPress={() => setPhoto(undefined)} style={styles.remove} hitSlop={8}><X size={16} color="#fff" /></Pressable>
              </Animated.View>
            )}
            {!isCorrection && (
              <View style={styles.tools}>
                <Pressable onPress={async () => { const u = await pickImage(); if (u) setPhoto(u); }} hitSlop={8} accessibilityLabel={t('threads.addPhoto')}>
                  <ImagePlus size={22} color={c.textSecondary} />
                </Pressable>
                {!parent && <Txt v="caption" color={c.textTertiary}>{t('threads.levelTag', { level: s.cefr ?? 'A1' })}</Txt>}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10, borderColor: c.divider }]}>
        <Txt v="caption" color={body.length > MAX - 40 ? c.drop : c.textTertiary}>{body.length}/{MAX}</Txt>
        <PressableScale onPress={submit} style={[styles.post, { backgroundColor: canPost ? c.text : c.divider }]}>
          {posting ? <ActivityIndicator color={c.background} /> : <Txt v="bodyMedium" color={canPost ? c.background : c.textTertiary}>{isCorrection ? t('threads.sendCorrection') : t('social.post')}</Txt>}
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  chip: { height: 34, paddingHorizontal: 12, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52, maxWidth: 640, width: '100%', alignSelf: 'center' },
  quote: { padding: 14, borderRadius: radius.m, marginBottom: 16 },
  input: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 24, minHeight: 60, paddingVertical: 4, textAlignVertical: 'top' },
  photo: { marginTop: 10, borderRadius: radius.m, overflow: 'hidden', width: '100%', aspectRatio: 1, maxWidth: 420 },
  remove: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  tools: { flexDirection: 'row', gap: 16, marginTop: 14, alignItems: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  post: { paddingHorizontal: 20, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', minWidth: 110 },
});
