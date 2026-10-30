import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { goBack } from '../../src/lib/nav';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from '../../src/components/icons';
import { ProfileView } from '../../src/components/ProfileView';
import { useTheme } from '../../src/theme/tokens';

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={{ height: 48, paddingHorizontal: 16, justifyContent: 'center', maxWidth: 680, width: '100%', alignSelf: 'center' }}>
        <Pressable onPress={() => (goBack('/(tabs)/arena'))} hitSlop={12}>
          <ArrowLeft size={22} color={c.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
        {id ? <ProfileView uid={id} /> : null}
      </ScrollView>
    </View>
  );
}
