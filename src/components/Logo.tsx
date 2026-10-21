import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Txt } from './ui';
import { fonts } from '../theme/tokens';

/** Thingual mark: a camera viewfinder framing a speech-bubble lens. Source: assets/brand/logo-source.js */
export function LogoMark({ size = 48, bare = false }: { size?: number; bare?: boolean }) {
  const corner = (x: number, y: number, dx: number, dy: number) => `M${x} ${y + dy * 150} L${x} ${y} L${x + dx * 150} ${y}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="tbg" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#0F5240" /><Stop offset="1" stopColor="#0B2350" /></LinearGradient>
        <RadialGradient id="tglow" cx="0.3" cy="0.25" r="0.8"><Stop offset="0" stopColor="#3FBF8F" stopOpacity={0.28} /><Stop offset="1" stopColor="#3FBF8F" stopOpacity={0} /></RadialGradient>
        <LinearGradient id="tcoral" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFB079" /><Stop offset="1" stopColor="#FF6B35" /></LinearGradient>
      </Defs>
      {!bare && <Rect width={1024} height={1024} rx={230} fill="url(#tbg)" />}
      {!bare && <Rect width={1024} height={1024} rx={230} fill="url(#tglow)" />}
      <G fill="none" stroke="#fff" strokeWidth={58} strokeLinecap="round" strokeLinejoin="round">
        <Path d={corner(238, 238, 1, 1)} /><Path d={corner(786, 238, -1, 1)} />
        <Path d={corner(238, 786, 1, -1)} /><Path d={corner(786, 786, -1, -1)} />
      </G>
      <Path d="M424 618 L392 704 L484 660 Z" fill="url(#tcoral)" />
      <Circle cx={512} cy={504} r={150} fill="url(#tcoral)" />
      <Circle cx={546} cy={470} r={46} fill="#fff" />
    </Svg>
  );
}

export function Logo({ size = 40, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.28 }}>
      <LogoMark size={size} />
      <Txt style={{ fontFamily: fonts.serif, fontSize: size * 0.8, lineHeight: size, color }}>Thingual</Txt>
    </View>
  );
}
