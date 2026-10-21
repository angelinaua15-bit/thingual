import { COCO_TO_CONCEPT, type Detection } from './cocoMap';

type CocoModel = { detect: (el: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, max?: number, minScore?: number) => Promise<{ class: string; score: number; bbox: [number, number, number, number] }[]> };

/** On-device object detection in the browser: TensorFlow.js + COCO-SSD (lite MobileNet v2, ~5 MB, cached by the browser). */
export const detectorSupported = true;

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`load ${src}`));
    document.head.appendChild(s);
  });

let modelPromise: Promise<CocoModel | null> | null = null;

export function loadDetector(): Promise<CocoModel | null> {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
        const w = window as unknown as { cocoSsd: { load: (o: { base: string }) => Promise<CocoModel> } };
        return await w.cocoSsd.load({ base: 'lite_mobilenet_v2' });
      } catch {
        modelPromise = null;
        return null;
      }
    })();
  }
  return modelPromise;
}

export async function detect(el: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, minScore = 0.5): Promise<Detection[]> {
  const model = await loadDetector();
  if (!model) return [];
  const raw = await model.detect(el, 20, minScore);
  return raw
    .filter((r) => COCO_TO_CONCEPT[r.class])
    .map((r) => ({ concept: COCO_TO_CONCEPT[r.class], label: r.class, score: r.score, box: r.bbox }));
}

/** Detect objects in a still image (gallery photo or a data URI). */
export async function detectUri(uri: string): Promise<Detection[]> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = uri;
  await img.decode().catch(() => undefined);
  if (!img.naturalWidth) return [];
  return detect(img, 0.4);
}
