import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BookOpen, Dumbbell, MessageCircle, User } from '../../src/components/icons';
import { EmojiArt } from '../../src/components/NoteBits';
import { MASCOT } from '../../src/components/PathBits';
import { useTheme, fonts } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { Txt } from '../../src/components/ui';
import { MiniPlayer } from '../../src/components/BookBits';
import { haptic } from '../../src/lib/feedback';

const ICONS: Record<string, typeof BookOpen> = { threads: MessageCircle, dictionary: BookOpen, learn: Dumbbell, profile: User };

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c, isDark } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const fg = c.text;
  const muted = c.textTertiary;
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(11,33,41,0.94)' : 'rgba(250,250,248,0.94)' }]} />
      )}
      <View style={[styles.hairline, { backgroundColor: c.divider }]} />
      <MiniPlayer />
      <View style={styles.row}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const Icon = ICONS[route.name] ?? BookOpen;
          const isCam = route.name === 'path';
          const onPress = () => {
            haptic.light();
            if (!focused) navigateToTab(route.key);
          };
          if (isCam) {
            return (
              <Pressable key={route.key} onPress={onPress} style={styles.item} accessibilityRole="button" accessibilityLabel={t('tabs.path')}>
                <CamButton focused={focused} />
              </Pressable>
            );
          }
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item} accessibilityRole="button" accessibilityLabel={t(`tabs.${route.name}`)}>
              <Icon size={22} color={focused ? fg : muted} strokeWidth={focused ? 2.2 : 1.6} />
              <Txt style={{ fontFamily: focused ? fonts.semibold : fonts.medium, fontSize: 10.5, color: focused ? fg : muted, marginTop: 3 }}>{t(`tabs.${route.name}`)}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** The middle button opens the learning path — the fox lives there. */
function CamButton({ focused }: { focused: boolean }) {
  const { c } = useTheme();
  const a = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(focused ? 1.08 : 1) }] }));
  return (
    <Animated.View style={[styles.cam, { backgroundColor: focused ? '#2FB574' : c.ink, borderColor: focused ? '#23905C' : 'transparent' }, a]}>
      <EmojiArt emoji={MASCOT} size={34} />
    </Animated.View>
  );
}

export const unstable_settings = { initialRouteName: 'path' };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarStyle: { position: 'absolute' } }}
      tabBar={(p) => <TabBar {...p} />}
    >
      <Tabs.Screen name="threads" />
      <Tabs.Screen name="dictionary" />
      <Tabs.Screen name="path" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  hairline: { position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, maxWidth: 560, width: '100%', alignSelf: 'center' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  cam: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
});

