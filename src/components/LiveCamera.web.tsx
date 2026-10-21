import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { detect, loadDetector } from '../lib/detect';
import type { Detection } from '../lib/cocoMap';
import { fonts } from '../theme/tokens';
import type { LiveCameraHandle, LiveCameraProps } from './LiveCamera';

type Dot = Detection & { x: number; y: number };

/** Browser camera with live on-device detection: a dot appears on every object the model recognises. */
export const LiveCamera = forwardRef<LiveCameraHandle, LiveCameraProps>(function LiveCamera({ live, onTapDetection, onStatus, labelFor, facing = 'back' }, ref) {
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [dots, setDots] = useState<Dot[]>([]);
  const busy = useRef(false);

  const start = useCallback(async () => {
    onStatus?.('loading');
    try {
      stream.current?.getTracks().forEach((t) => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing === 'back' ? 'environment' : 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => {});
      }
      onStatus?.('ready');
      loadDetector().then((m) => onStatus?.(m ? 'ready' : 'nomodel'));
    } catch (e) {
      const name = (e as { name?: string })?.name;
      onStatus?.(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'nocamera');
    }
  }, [facing]);

  useEffect(() => {
    start();
    return () => stream.current?.getTracks().forEach((t) => t.stop());
  }, [start]);

  /* map a box in video pixels to view coordinates (object-fit: cover) */
  const toView = (box: [number, number, number, number]) => {
    const v = video.current;
    if (!v || !v.videoWidth) return null;
    const scale = Math.max(size.w / v.videoWidth, size.h / v.videoHeight);
    const ox = (size.w - v.videoWidth * scale) / 2;
    const oy = (size.h - v.videoHeight * scale) / 2;
    return { x: (box[0] + box[2] / 2) * scale + ox, y: (box[1] + box[3] / 2) * scale + oy };
  };

  useEffect(() => {
    if (!live) {
      setDots([]);
      return;
    }
    const id = setInterval(async () => {
      const v = video.current;
      if (busy.current || !v || v.readyState < 2) return;
      busy.current = true;
      try {
        const found = await detect(v, 0.55);
        const best = new Map<string, Detection>();
        found.forEach((d) => {
          const cur = best.get(d.concept);
          if (!cur || cur.score < d.score) best.set(d.concept, d);
        });
        const next: Dot[] = [];
        best.forEach((d) => {
          const p = toView(d.box);
          if (p && p.x > 0 && p.y > 0 && p.x < size.w && p.y < size.h) next.push({ ...d, ...p });
        });
        setDots(next);
      } finally {
        busy.current = false;
      }
    }, 400);
    return () => clearInterval(id);
  }, [live, size.w, size.h]);

  const crop = (box?: [number, number, number, number]) => {
    const v = video.current;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement('canvas');
    let [x, y, w, h] = box ?? [0, 0, v.videoWidth, v.videoHeight];
    if (box) {
      const pad = 0.18;
      x = Math.max(0, x - w * pad);
      y = Math.max(0, y - h * pad);
      w = Math.min(v.videoWidth - x, w * (1 + pad * 2));
      h = Math.min(v.videoHeight - y, h * (1 + pad * 2));
    }
    const max = 1080;
    const k = Math.min(1, max / Math.max(w, h));
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext('2d')?.drawImage(v, x, y, w, h, 0, 0, c.width, c.height);
    return c;
  };

  useImperativeHandle(ref, () => ({
    capture: async () => {
      const c = crop();
      if (!c) return null;
      const detections = await detect(c, 0.45);
      const uri = c.toDataURL('image/jpeg', 0.85);
      return { uri, base64: uri.split(',')[1], detections };
    },
    request: start,
  }));

  return (
    <View style={StyleSheet.absoluteFill} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {React.createElement('video', {
        ref: video,
        autoPlay: true,
        playsInline: true,
        muted: true,
        style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000', transform: facing === 'front' ? 'scaleX(-1)' : undefined },
      })}
      {dots.map((d) => (
        <Animated.View key={d.concept} entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} style={[styles.dotWrap, { left: d.x - 40, top: d.y - 40 }]}>
          <Pressable
            onPress={() => {
              const c = crop(d.box);
              if (c) onTapDetection(d, c.toDataURL('image/jpeg', 0.88));
            }}
            hitSlop={16}
            style={{ alignItems: 'center' }}
          >
            <PulseDot />
            {labelFor ? (
              <View style={styles.label}>
                <Text style={styles.labelText} numberOfLines={1}>{labelFor(d.concept)}</Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
});

function PulseDot() {
  const p = useSharedValue(1);
  useEffect(() => {
    p.value = withRepeat(withSequence(withTiming(1.5, { duration: 1100 }), withTiming(1, { duration: 1100 })), -1);
  }, []);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: p.value }], opacity: 1.6 - p.value * 0.9 }));
  return (
    <View style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[styles.ring, ring]} />
      <View style={styles.core} />
    </View>
  );
}

const styles = StyleSheet.create({
  dotWrap: { position: 'absolute', width: 80, alignItems: 'center' },
  ring: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff' },
  core: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', shadowColor: '#fff', shadowOpacity: 0.9, shadowRadius: 10 },
  label: { marginTop: -14, backgroundColor: 'rgba(14,14,14,0.72)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, maxWidth: 160 },
  labelText: { color: '#fff', fontFamily: fonts.serif, fontSize: 17 },
});
