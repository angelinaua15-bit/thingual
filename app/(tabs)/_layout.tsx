import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BookOpen, Camera, Globe2, GraduationCap, User } from '../../src/components/icons';
import { useTheme, fonts } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { Txt } from '../../src/components/ui';
import { haptic } from '../../src/lib/feedback';

const ICONS: Record<string, typeof Globe2> = { map: Globe2, dictionary: BookOpen, camera: Camera, learn: GraduationCap, profile: User };

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c, isDark } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const onCamera = state.routes[state.index]?.name === 'camera';
  const fg = onCamera ? '#FFFFFF' : c.text;
  const muted = onCamera ? 'rgba(255,255,255,0.55)' : c.textTertiary;
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={onCamera ? 30 : 60} tint={onCamera || isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: onCamera ? 'rgba(0,0,0,0.55)' : isDark ? 'rgba(11,33,41,0.94)' : 'rgba(250,250,248,0.94)' }]} />
      )}
      {!onCamera && <View style={[styles.hairline, { backgroundColor: c.divider }]} />}
      <View style={styles.row}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const Icon = ICONS[route.name] ?? Globe2;
          const isCam = route.name === 'camera';
          const onPress = () => {
            haptic.light();
            if (!focused) navigateToTab(route.key);
          };
          if (isCam) {
            return (
              <Pressable key={route.key} onPress={onPress} style={styles.item} accessibilityRole="button" accessibilityLabel={t('tabs.camera')}>
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

function CamButton({ focused }: { focused: boolean }) {
  const { c } = useTheme();
  const a = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(focused ? 1.06 : 1) }] }));
  return (
    <Animated.View style={[styles.cam, { backgroundColor: focused ? '#FFFFFF' : c.ink, borderColor: focused ? 'rgba(255,255,255,0.35)' : 'transparent' }, a]}>
      <Camera size={22} color={focused ? '#141414' : c.background} strokeWidth={2} />
    </Animated.View>
  );
}

export const unstable_settings = { initialRouteName: 'camera' };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarStyle: { position: 'absolute' } }}
      tabBar={(p) => <TabBar {...p} />}
    >
      <Tabs.Screen name="map" />
      <Tabs.Screen name="dictionary" />
      <Tabs.Screen name="camera" />
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

