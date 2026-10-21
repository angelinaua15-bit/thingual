import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Txt } from './ui';
import { fonts } from '../theme/tokens';

/** Thingual mark: glass lens inside a speech bubble, framed by a viewfinder. Source: assets/brand/logo-source.js */
export function LogoMark({ size = 48 }: { size?: number }) {
  return <Image source={require('../../assets/brand/mark.webp')} style={{ width: size, height: size }} contentFit="contain" />;
}

export function Logo({ size = 40, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.28 }}>
      <LogoMark size={size} />
      <Txt style={{ fontFamily: fonts.serif, fontSize: size * 0.8, lineHeight: size, color }}>Thingual</Txt>
    </View>
  );
}
