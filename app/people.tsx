import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Search } from '../src/components/icons';
import { Avatar, Button, Txt } from '../src/components/ui';
import { toast } from '../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { follow, followList, followingIds, searchProfiles, unfollow, type Profile } from '../src/lib/api';
import { useNet } from '../src/lib/queries';
import { haptic } from '../src/lib/feedback';

/** Find people (search) or a followers / following list. */
export default function People() {
  const params = useLocalSearchParams<{ uid?: string; kind?: 'followers' | 'following' }>();
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const me = useNet((s) => s.uid);
  const [q, setQ] = useState('');
  const isList = !!params.uid && !!params.kind;

  const list = useQuery({
    queryKey: isList ? ['followList', params.uid, params.kind] : ['search', q],
    queryFn: () => (isList ? followList(params.uid!, params.kind!) : searchProfiles(q)),
  });
  const mine = useQuery({ queryKey: ['followingIds', me], queryFn: () => followingIds(), enabled: !!me });

  const title = isList ? (params.kind === 'followers' ? t('social.followers') : t('social.followingCount')) : t('social.findPeople');

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
        <Txt v="headline" style={{ textTransform: isList ? 'capitalize' : 'none' }}>{title}</Txt>
      </View>
      <View style={{ maxWidth: 640, width: '100%', alignSelf: 'center', flex: 1 }}>
        {!isList && (
          <View style={[styles.search, { backgroundColor: c.surfaceAlt, marginHorizontal: space.m }]}>
            <Search size={18} color={c.textSecondary} />
            <TextInput value={q} onChangeText={setQ} placeholder={t('social.searchPeople')} placeholderTextColor={c.textTertiary} autoCapitalize="none" autoCorrect={false} style={{ flex: 1, color: c.text, fontFamily: fonts.regular, fontSize: 16, height: 44 }} />
          </View>
        )}
        {!isList && !q && <Txt v="overline" color={c.textSecondary} style={{ marginHorizontal: space.m, marginTop: 18, marginBottom: 4 }}>{t('social.suggested')}</Txt>}
        {list.isLoading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={c.textSecondary} />
        ) : list.isError ? (
          <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 30 }}>{t('social.offline')}</Txt>
        ) : (
          <FlatList
            data={(list.data ?? []).filter((p) => p.id !== me || isList)}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ paddingHorizontal: space.m, paddingBottom: insets.bottom + 40 }}
            ListEmptyComponent={<Txt v="callout" color={c.textSecondary} center style={{ marginTop: 30 }}>{t('social.noResults')}</Txt>}
            renderItem={({ item, index }) => <PersonRow p={item} i={index} following={!!mine.data?.includes(item.id)} isMe={item.id === me} />}
          />
        )}
      </View>
    </View>
  );
}

export function PersonRow({ p, i, following, isMe }: { p: Profile; i: number; following: boolean; isMe: boolean }) {
  const { c } = useTheme();
  const { t } = useT();
  const qc = useQueryClient();
  const me = useNet((s) => s.uid);
  const [on, setOn] = useState(following);
  React.useEffect(() => setOn(following), [following]);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(i, 10) * 40)}>
      <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: p.id } })} style={[styles.row, { borderColor: c.divider }]}>
        <Avatar seed={p.id} size={46} label={p.name || p.handle} uri={p.avatar_url} />
        <View style={{ flex: 1 }}>
          <Txt v="bodyMedium" numberOfLines={1}>{p.name || p.handle}</Txt>
          <Txt v="caption" color={c.textSecondary} numberOfLines={1}>@{p.handle}{p.bio ? ` · ${p.bio}` : ''}</Txt>
          <Txt v="caption" color={c.textTertiary}>{p.followers_count} {t('social.followers')}</Txt>
        </View>
        {!isMe && (
          <Button
            title={on ? t('social.following') : t('social.follow')}
            variant={on ? 'secondary' : 'primary'}
            size="m"
            style={{ height: 36, paddingHorizontal: 14 }}
            onPress={async () => {
              haptic.light();
              setOn(!on);
              try {
                if (on) await unfollow(p.id);
                else await follow(p.id);
                qc.invalidateQueries({ queryKey: ['followingIds', me] });
                qc.invalidateQueries({ queryKey: ['feed'] });
              } catch {
                setOn(on);
                toast(t('social.offline'), 'default');
              }
            }}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 52, maxWidth: 640, width: '100%', alignSelf: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.s, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
