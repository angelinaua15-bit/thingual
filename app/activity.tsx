import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { goBack } from '../src/lib/nav';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Swords, UserPlus } from '../src/components/icons';
import { Avatar, Txt } from '../src/components/ui';
import { useTheme, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { activity } from '../src/lib/api';
import { timeAgo } from '../src/lib/feedback';

export default function ActivityScreen() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const q = useQuery({ queryKey: ['activity'], queryFn: activity });
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack()} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
        <Txt v="headline">{t('social.activity')}</Txt>
      </View>
      {q.isLoading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color={c.textSecondary} />
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(a, i) => `${a.kind}-${a.at}-${i}`}
          contentContainerStyle={{ paddingHorizontal: space.m, paddingBottom: insets.bottom + 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          ListEmptyComponent={<Txt v="callout" color={c.textSecondary} center style={{ marginTop: 40 }}>{q.isError ? t('social.offline') : t('social.noActivity')}</Txt>}
          renderItem={({ item, index }) => {
            const Icon = item.kind === 'follow' ? UserPlus : Swords;
            const color = item.kind === 'follow' ? c.accent : '#EA580C';
            return (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 40)}>
                <Pressable
                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.user.id } })}
                  style={[styles.row, { borderColor: c.divider }]}
                >
                  <View>
                    <Avatar seed={item.user.id} size={42} label={item.user.name || item.user.handle} uri={item.user.avatar_url} />
                    <View style={[styles.badge, { backgroundColor: c.background }]}><Icon size={12} color={color} /></View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt v="callout"><Txt v="bodyMedium">{item.user.handle}</Txt> {item.kind === 'follow' ? t('social.actFollow') : t('arena.actDuel', { a: item.theirs, b: item.mine })}</Txt>
                    <Txt v="caption" color={c.textTertiary}>{timeAgo(new Date(item.at).getTime(), t)}</Txt>
                  </View>
                </Pressable>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 52, maxWidth: 640, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  badge: { position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
