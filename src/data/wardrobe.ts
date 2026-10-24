/** Tingo's wardrobe: things the fox can wear, bought with crystals. */
export type Slot = 'hat' | 'face' | 'neck';
export type Wear = { id: string; slot: Slot; emoji: string; price: number; name: { en: string; uk: string } };

export const WARDROBE: Wear[] = [
  { id: 'cap', slot: 'hat', emoji: '🧢', price: 30, name: { en: 'Cap', uk: 'Кепка' } },
  { id: 'bow', slot: 'hat', emoji: '🎀', price: 30, name: { en: 'Bow', uk: 'Бантик' } },
  { id: 'flower', slot: 'hat', emoji: '🌸', price: 35, name: { en: 'Flower', uk: 'Квітка' } },
  { id: 'headphones', slot: 'hat', emoji: '🎧', price: 50, name: { en: 'Headphones', uk: 'Навушники' } },
  { id: 'grad', slot: 'hat', emoji: '🎓', price: 60, name: { en: 'Graduate cap', uk: 'Шапка випускника' } },
  { id: 'tophat', slot: 'hat', emoji: '🎩', price: 70, name: { en: 'Top hat', uk: 'Циліндр' } },
  { id: 'crown', slot: 'hat', emoji: '👑', price: 120, name: { en: 'Crown', uk: 'Корона' } },
  { id: 'glasses', slot: 'face', emoji: '👓', price: 30, name: { en: 'Glasses', uk: 'Окуляри' } },
  { id: 'shades', slot: 'face', emoji: '🕶️', price: 45, name: { en: 'Sunglasses', uk: 'Сонцезахисні' } },
  { id: 'goggles', slot: 'face', emoji: '🥽', price: 55, name: { en: 'Ski goggles', uk: 'Гірськолижна маска' } },
  { id: 'scarf', slot: 'neck', emoji: '🧣', price: 35, name: { en: 'Scarf', uk: 'Шарф' } },
  { id: 'medal', slot: 'neck', emoji: '🏅', price: 60, name: { en: 'Medal', uk: 'Медаль' } },
  { id: 'butterfly', slot: 'neck', emoji: '🦋', price: 40, name: { en: 'Butterfly', uk: 'Метелик' } },
];
export const wearById = (id?: string) => WARDROBE.find((w) => w.id === id);
