import React, { useMemo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildMapHtml, MapPoint, MapStyle } from './mapHtml';
import { useTheme } from '../theme/tokens';

export type WorldMapProps = {
  points: MapPoint[];
  wordsMode?: boolean;
  onSelect?: (id: string) => void;
  onBlank?: () => void;
  style?: StyleProp<ViewStyle>;
  center?: [number, number];
  zoom?: number;
  mapStyle?: MapStyle;
  /** my approximate position: shown as a pulsing dot */
  me?: [number, number] | null;
};

export function WorldMap({ points, wordsMode = false, onSelect, onBlank, style, center, zoom, mapStyle = 'color', me }: WorldMapProps) {
  const { isDark } = useTheme();
  const html = useMemo(() => buildMapHtml(points, { dark: isDark, wordsMode, center: me ?? center, zoom: me ? 9 : zoom, style: mapStyle }), [points, isDark, wordsMode, center, zoom, mapStyle, me]);
  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        onMessage={(e) => {
          try {
            const m = JSON.parse(e.nativeEvent.data);
            if (m.type === 'select') onSelect?.(m.id);
        if (m.type === 'blank') onBlank?.();
          } catch {}
        }}
      />
    </View>
  );
}
