import React, { ReactNode, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useAnimatedProps, useSharedValue, withTiming, Easing, FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { create } from 'zustand';
import { Check } from './icons';
import { useTheme, radius, fonts } from '../theme/tokens';
import { Txt } from './ui';

/* ---------------- Toast ---------------- */
type ToastState = { msg?: string; key: number; tone?: 'default' | 'success'; show: (msg: string, tone?: 'default' | 'success') => void };
export const useToast = create<ToastState>((set) => ({
  key: 0,
  show: (msg, tone = 'success') => set((s) => ({ msg, tone, key: s.key + 1 })),
}));
export const toast = (msg: string, tone?: 'default' | 'success') => useToast.getState().show(msg, tone);

export function ToastHost() {
  const { msg, key, tone } = useToast();
  const [visible, setVisible] = React.useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!msg) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, [key]);
  if (!visible || !msg) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center' }]}>
      <Animated.View
        key={key}
        entering={FadeInUp.springify().damping(18)}
        exiting={FadeOutUp.duration(200)}
        style={{ marginTop: insets.top + 8, backgroundColor: '#141414', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999, flexDirection: 'row', gap: 8, alignItems: 'center', maxWidth: 360 }}
      >
        {tone === 'success' && <Check size={16} color="#51CF66" />}
        <Txt v="captionMedium" color="#FFFFFF" style={{ fontSize: 14 }}>{msg}</Txt>
      </Animated.View>
    </View>
  );
}

/* ---------------- Bottom sheet ---------------- */
export function Sheet({ visible, onClose, children, title }: { visible: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible && (
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={onClose} />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.springify().damping(22).stiffness(220)}
            exiting={SlideOutDown.duration(220)}
            style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: insets.bottom + 16, maxHeight: height * 0.88, width: '100%', maxWidth: 640, alignSelf: 'center' }}
          >
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.divider }} />
            </View>
            {title ? <Txt v="headline" style={{ paddingHorizontal: 20, paddingVertical: 8 }}>{title}</Txt> : null}
            {children}
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

/* ---------------- Timer ring (Daily Drop) ---------------- */
const ACircle = Animated.createAnimatedComponent(Circle);
export function TimerRing({ size, progress, color, width = 4, children }: { size: number; progress: number; color: string; width?: number; children?: ReactNode }) {
  const r = (size - width) / 2;
  const circ = 2 * Math.PI * r;
  const p = useSharedValue(progress);
  useEffect(() => {
    p.value = withTiming(progress, { duration: 900, easing: Easing.linear });
  }, [progress]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.25)" strokeWidth={width} fill="none" />
        <ACircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={width}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeLinecap="round"
          animatedProps={props}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export const monoStyle = { fontFamily: fonts.semibold, fontVariant: ['tabular-nums' as const] };
