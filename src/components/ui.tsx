import { BrandBackground } from './BrandBackground';
import React, { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, PressableProps, StyleProp, StyleSheet, Switch, Text, TextProps, TextStyle, View, ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { ChevronRight } from './icons';
import { fonts, radius, space, type, useTheme } from '../theme/tokens';
import { haptic } from '../lib/feedback';
import { avatarColors } from '../data/social';

/* ---------------- Text ---------------- */
type Variant = keyof typeof type;
export function Txt({ v = 'body', color, style, center, ...rest }: TextProps & { v?: Variant; color?: string; center?: boolean }) {
  const { c } = useTheme();
  const flat = StyleSheet.flatten(style as object) as { fontSize?: number; lineHeight?: number } | undefined;
  const autoLH = flat?.fontSize && !flat.lineHeight ? { lineHeight: Math.round(flat.fontSize * 1.18) } : null;
  return <Text {...rest} style={[type[v] as TextStyle, { color: color ?? c.text }, center && { textAlign: 'center' }, style, autoLH]} />;
}

/* ---------------- Screen ---------------- */
export function Screen({ children, edges = ['top'], style }: { children: ReactNode; edges?: Edge[]; style?: StyleProp<ViewStyle> }) {
  const { c, isDark } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: c.background }, style]}>
      {isDark && <BrandBackground />}
      {children}
    </SafeAreaView>
  );
}

/* ---------------- Pressable with spring scale ---------------- */
const OUTER_KEYS = new Set(['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width', 'maxWidth', 'minWidth', 'position', 'top', 'left', 'right', 'bottom', 'zIndex']);
export function PressableScale({ children, style, scaleTo = 0.97, onPress, haptics = true, ...rest }: PressableProps & { scaleTo?: number; haptics?: boolean; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const flat = (StyleSheet.flatten(style as object) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  Object.keys(flat).forEach((k) => {
    if (OUTER_KEYS.has(k) || k.startsWith('margin')) outer[k] = flat[k];
    else inner[k] = flat[k];
  });
  if (outer.flex !== undefined || outer.width !== undefined || outer.alignSelf === 'stretch') inner.alignSelf = 'stretch';
  return (
    <Pressable
      {...rest}
      style={outer as ViewStyle}
      onPressIn={(e) => {
        s.value = withSpring(scaleTo, { damping: 20, stiffness: 400 });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, { damping: 14, stiffness: 300 });
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptics) haptic.light();
        onPress?.(e);
      }}
    >
      <Animated.View style={[inner as ViewStyle, { flexGrow: outer.flex !== undefined || outer.height !== undefined ? 1 : 0 }, a]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ---------------- Button ---------------- */
export function Button({
  title, onPress, variant = 'primary', icon, loading, disabled, style, size = 'l',
}: {
  title: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'drop' | 'inverse' | 'danger';
  icon?: ReactNode; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; size?: 'm' | 'l';
}) {
  const { c } = useTheme();
  const bg = {
    primary: c.accent, secondary: c.surfaceAlt, ghost: 'transparent', drop: c.drop, inverse: '#FFFFFF', danger: c.errorSoft,
  }[variant];
  const fg = {
    primary: c.onAccent, secondary: c.text, ghost: c.text, drop: '#FFFFFF', inverse: '#141414', danger: c.error,
  }[variant];
  return (
    <PressableScale
      onPress={disabled || loading ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        styles.btn,
        { backgroundColor: bg, height: size === 'l' ? 54 : 44, opacity: disabled ? 0.4 : 1, paddingHorizontal: size === 'l' ? 22 : 16 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={{ fontFamily: fonts.semibold, fontSize: size === 'l' ? 16 : 15, color: fg }}>{title}</Text>
        </>
      )}
    </PressableScale>
  );
}

/* ---------------- Chip ---------------- */
export function Chip({ label, selected, onPress, icon, tone }: { label: string; selected?: boolean; onPress?: () => void; icon?: ReactNode; tone?: 'drop' }) {
  const { c } = useTheme();
  const activeBg = tone === 'drop' ? c.drop : c.text;
  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? activeBg : c.surface, borderColor: selected ? activeBg : c.divider },
      ]}
    >
      {icon}
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: selected ? c.background : c.text }}>{label}</Text>
    </PressableScale>
  );
}

/* ---------------- Segmented control ---------------- */
export function Segmented<T extends string>({ options, value, onChange, style }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const [w, setW] = React.useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  React.useEffect(() => {
    x.value = withSpring((w / options.length) * idx, { damping: 22, stiffness: 260 });
  }, [idx, w]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width - 6)} style={[styles.seg, { backgroundColor: c.surfaceAlt }, style]}>
      {w > 0 && <Animated.View style={[styles.segThumb, { width: w / options.length, backgroundColor: c.surface }, thumb]} />}
      {options.map((o) => (
        <Pressable key={o.value} style={styles.segItem} onPress={() => { haptic.light(); onChange(o.value); }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: o.value === value ? c.text : c.textSecondary }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ---------------- List row & toggle ---------------- */
export function ListRow({ title, subtitle, value, onPress, icon, right, danger }: { title: string; subtitle?: string; value?: string; onPress?: () => void; icon?: ReactNode; right?: ReactNode; danger?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.surfaceAlt : c.surface }]}>
      {icon && <View style={{ width: 28, alignItems: 'center' }}>{icon}</View>}
      <View style={{ flex: 1 }}>
        <Txt v="bodyMedium" color={danger ? c.error : c.text}>{title}</Txt>
        {subtitle ? <Txt v="caption" color={c.textSecondary} style={{ marginTop: 2 }}>{subtitle}</Txt> : null}
      </View>
      {value ? <Txt v="callout" color={c.textSecondary}>{value}</Txt> : null}
      {right}
      {onPress && !right ? <ChevronRight size={18} color={c.textTertiary} /> : null}
    </Pressable>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={(v) => { haptic.light(); onChange(v); }}
      trackColor={{ true: c.accent, false: c.divider }}
      thumbColor="#FFFFFF"
      {...({ activeThumbColor: '#FFFFFF' } as object)}
    />
  );
}

export function Group({ children, title, footer }: { children: ReactNode; title?: string; footer?: string }) {
  const { c } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ marginBottom: space.l }}>
      {title ? <Txt v="overline" color={c.textSecondary} style={{ marginBottom: 8, marginLeft: 4 }}>{title}</Txt> : null}
      <View style={{ borderRadius: radius.l, overflow: 'hidden', backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.divider }}>
        {items.map((ch, i) => (
          <View key={i}>
            {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.divider, marginLeft: 16 }} />}
            {ch}
          </View>
        ))}
      </View>
      {footer ? <Txt v="caption" color={c.textSecondary} style={{ marginTop: 8, marginHorizontal: 4 }}>{footer}</Txt> : null}
    </View>
  );
}

/* ---------------- Section header ---------------- */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Txt v="headline">{title}</Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Txt v="captionMedium" color={c.accent}>{action}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------------- Avatar ---------------- */
export function Avatar({ seed, size = 40, label, uri }: { seed: string; size?: number; label?: string; uri?: string | null }) {
  const [a, b] = avatarColors(seed);
  if (uri) {
    return <ExpoImage source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#ddd' }} contentFit="cover" transition={200} />;
  }
  return (
    <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      {label ? <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: size * 0.38 }}>{label.slice(0, 1).toUpperCase()}</Text> : null}
    </LinearGradient>
  );
}

/* ---------------- Progress bar ---------------- */
const SWEEP = { from: { left: '-20%' }, '60%': { left: '110%' }, to: { left: '110%' } };

export function ProgressBar({ value, color, height = 4, track }: { value: number; color?: string; height?: number; track?: string }) {
  const { c } = useTheme();
  const w = useSharedValue(0);
  React.useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 450 });
  }, [value]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track ?? c.divider, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: color ?? c.accent, overflow: 'hidden' }, a]}>
        {height >= 10 && (
          <>
            {/* a glossy stripe and a light sweep on thick bars (lesson progress) */}
            <View style={{ position: 'absolute', left: height / 2, right: height / 2, top: height * 0.22, height: height * 0.24, borderRadius: height, backgroundColor: 'rgba(255,255,255,.35)' }} />
            <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: 40, backgroundColor: 'rgba(255,255,255,.35)', transform: [{ skewX: '-20deg' }] },
              { animationName: SWEEP, animationDuration: 2400, animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' } as never]} />
          </>
        )}
      </Animated.View>
    </View>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({ title, sub, cta, onCta, art }: { title: string; sub?: string; cta?: string; onCta?: () => void; art?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: space.xl, gap: 12 }}>
      {art}
      <Txt v="headline" center>{title}</Txt>
      {sub ? <Txt v="callout" color={c.textSecondary} center style={{ maxWidth: 300 }}>{sub}</Txt> : null}
      {cta ? <Button title={cta} onPress={onCta} style={{ marginTop: 8 }} /> : null}
    </View>
  );
}

export function PlusBadge() {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.accentSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
      <Text style={{ color: c.accent, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.4 }}>PLUS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.s, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 999, borderWidth: 1 },
  seg: { flexDirection: 'row', borderRadius: 12, padding: 3, height: 40 },
  segThumb: { position: 'absolute', top: 3, left: 3, bottom: 3, borderRadius: 9, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 52 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
});
