import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, cancelAnimation } from 'react-native-reanimated';
import { FLAMES, FlameId } from '../lib/streak';
import { useApp } from '../store/useApp';

export const FLAME_OUTER = 'M32 2C36 16 52 27 52 49C52 67 43 78 32 78C21 78 12 67 12 51C12 39 18 31 22 24C23 32 26 36 30 38C28 26 29.5 12 32 2Z';
export const FLAME_INNER = 'M33 35C36 44 44 50 44 60C44 70 39 76 32 76C25 76 20 70 20 62C20 55 24 50 27 46C28 52 30 54 32 55C31 48 31 41 33 35Z';

/** Two-tone flame. `active=false` renders it grey (streak not extended today). */
export function Flame({ size = 64, active = true, skin, animate = true, colors }: { size?: number; active?: boolean; skin?: FlameId; animate?: boolean; colors?: [string, string] }) {
  const mine = useApp((s) => s.flame);
  const reduce = useApp((s) => s.settings.reduceMotion);
  const [outer, inner] = colors ?? (active ? FLAMES[skin ?? mine].colors : ['#BDBDBD', '#E6E6E6']);
  const flick = useSharedValue(0);
  const id = `fl-${skin ?? mine}-${active ? 1 : 0}-${Math.round(size)}`;

  useEffect(() => {
    if (!animate || !active || reduce) return;
    flick.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }),
        withTiming(-0.6, { duration: 460, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 380, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    return () => cancelAnimation(flick);
  }, [animate, active, reduce]);

  const st = useAnimatedStyle(() => ({
    transform: [{ translateY: size * 0.03 * -flick.value }, { scaleY: 1 + flick.value * 0.045 }, { scaleX: 1 - flick.value * 0.025 }, { rotate: `${flick.value * 1.6}deg` }],
  }));
  const innerSt = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - flick.value * 0.07 }, { translateY: flick.value * size * 0.02 }] }));

  const h = size * 1.25;
  return (
    <View style={{ width: size, height: h }}>
      <Animated.View style={[{ position: 'absolute', width: size, height: h }, st]}>
        <Svg width={size} height={h} viewBox="0 0 64 80">
          <Defs>
            <SvgGradient id={id} x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={outer} />
              <Stop offset="1" stopColor={outer} stopOpacity={0.82} />
            </SvgGradient>
          </Defs>
          <Path d={FLAME_OUTER} fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', width: size, height: h }, innerSt]}>
        <Svg width={size} height={h} viewBox="0 0 64 80">
          <Path d={FLAME_INNER} fill={inner} opacity={0.95} />
        </Svg>
      </Animated.View>
    </View>
  );
}
