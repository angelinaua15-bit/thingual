import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { Txt, Button } from '../../src/components/ui';
import { PostCard } from '../../src/components/PostCard';
import { useTheme, fonts, space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { WORLD_POSTS, friendPosts } from '../../src/data/social';
import { conceptById, fullWord } from '../../src/data/concepts';
import { LANGUAGES } from '../../src/data/languages';
import { speak } from '../../src/lib/feedback';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const myPosts = useApp((x) => x.myPosts);
  const s = useApp((x) => x.settings);
  const post = [...myPosts, ...friendPosts(), ...WORLD_POSTS].find((p) => p.id === id);
  if (!post) return null;
  const concept = conceptById(post.concept)!;
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={c.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.m, paddingBottom: insets.bottom + 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <PostCard post={post} />
        <Txt v="headline" style={{ marginBottom: 12 }}>{t('word.worldSays')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LANGUAGES.map((l) => (
            <Pressable key={l.code} onPress={() => speak(concept.labels[l.code].word, l.code)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: l.code === post.authorLang ? c.accentSoft : c.surface, borderWidth: 1, borderColor: c.divider }}>
              <Txt style={{ fontFamily: fonts.serif, fontSize: 20, color: c.text }}>{concept.labels[l.code].word}</Txt>
              <Txt v="caption" color={c.textSecondary} style={{ fontSize: 11 }}>{l.native}</Txt>
            </Pressable>
          ))}
        </View>
        <Button
          title={fullWord(post.concept, s.active)}
          variant="secondary"
          icon={<ArrowRight size={16} color={c.text} />}
          style={{ marginTop: 24 }}
          onPress={() => router.push({ pathname: '/word/[id]', params: { id: post.concept } })}
        />
      </ScrollView>
    </View>
  );
}
