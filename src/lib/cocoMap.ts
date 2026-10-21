/** COCO-SSD class → Thingual concept id. Classes not listed here (e.g. "person") are ignored. */
export const COCO_TO_CONCEPT: Record<string, string> = {
  bicycle: 'bicycle', car: 'car', bus: 'bus', truck: 'truck', bench: 'bench', bird: 'bird', cat: 'cat', dog: 'dog',
  backpack: 'backpack', umbrella: 'umbrella', handbag: 'bag', suitcase: 'suitcase', 'sports ball': 'ball',
  bottle: 'bottle', 'wine glass': 'glass', cup: 'cup', fork: 'fork', knife: 'knife', spoon: 'spoon', bowl: 'bowl',
  banana: 'banana', apple: 'apple', orange: 'orange', carrot: 'carrot', pizza: 'pizza', cake: 'cake', donut: 'donut',
  chair: 'chair', couch: 'sofa', 'potted plant': 'plant', bed: 'bed', 'dining table': 'table', tv: 'tv', laptop: 'laptop',
  mouse: 'mouse', keyboard: 'keyboard', 'cell phone': 'phone', microwave: 'microwave', refrigerator: 'fridge', sink: 'sink',
  motorcycle: 'motorcycle', airplane: 'airplane', train: 'train', boat: 'boat', 'traffic light': 'traffic-light', 'stop sign': 'road-sign',
  horse: 'horse', sheep: 'sheep', cow: 'cow', elephant: 'elephant', bear: 'bear', zebra: 'zebra', giraffe: 'giraffe',
  tie: 'tie', frisbee: 'frisbee', skis: 'skis', snowboard: 'snowboard', kite: 'kite', 'baseball bat': 'baseball-bat', 'baseball glove': 'baseball',
  skateboard: 'skateboard', surfboard: 'surfboard', 'tennis racket': 'tennis-racket', sandwich: 'sandwich', broccoli: 'broccoli', 'hot dog': 'hot-dog',
  toilet: 'toilet', remote: 'remote-control', toaster: 'toaster', 'teddy bear': 'teddy-bear', 'hair drier': 'hair-dryer',
  book: 'book', clock: 'clock', vase: 'vase', scissors: 'scissors', toothbrush: 'toothbrush', oven: 'oven',
};

export type Detection = { concept: string; label: string; score: number; box: [number, number, number, number] };
