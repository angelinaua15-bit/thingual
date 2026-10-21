/** COCO-SSD class → Thingual concept id. Classes not listed here (e.g. "person") are ignored. */
export const COCO_TO_CONCEPT: Record<string, string> = {
  bicycle: 'bicycle', car: 'car', bus: 'bus', truck: 'car', bench: 'bench', bird: 'bird', cat: 'cat', dog: 'dog',
  backpack: 'backpack', umbrella: 'umbrella', handbag: 'bag', suitcase: 'suitcase', 'sports ball': 'ball',
  bottle: 'bottle', 'wine glass': 'glass', cup: 'cup', fork: 'fork', knife: 'knife', spoon: 'spoon', bowl: 'bowl',
  banana: 'banana', apple: 'apple', orange: 'orange', carrot: 'carrot', pizza: 'pizza', cake: 'cake', donut: 'cake',
  chair: 'chair', couch: 'sofa', 'potted plant': 'plant', bed: 'bed', 'dining table': 'table', tv: 'tv', laptop: 'laptop',
  mouse: 'mouse', keyboard: 'keyboard', 'cell phone': 'phone', microwave: 'microwave', refrigerator: 'fridge', sink: 'sink',
  book: 'book', clock: 'clock', vase: 'vase', scissors: 'scissors', toothbrush: 'toothbrush', oven: 'microwave',
};

export type Detection = { concept: string; label: string; score: number; box: [number, number, number, number] };
