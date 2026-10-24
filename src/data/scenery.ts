import type { Topic } from './concepts';

/** Little things that float beside the path in each unit — a world for every topic. */
export const SCENERY: Record<Topic | 'mix', string[]> = {
  people: ['🎈', '💌', '🏡'], food: ['🥐', '🍓', '🧀'], fruits: ['🍉', '🍇', '🍋'], home: ['🪴', '🛋️', '🕯️'], kitchen: ['🍳', '🧁', '🫖'],
  clothes: ['👗', '🧢', '👟'], colors: ['🎨', '🌈', '🖍️'], time: ['⏰', '📅', '⌛'], actions: ['🏃', '🛹', '🧗'], qualities: ['✨', '⚖️', '💎'],
  animals: ['🐾', '🦋', '🐢'], nature: ['🌳', '🍄', '🌻'], city: ['🏙️', '🚦', '🎡'], transport: ['🚲', '🚆', '⛵'], travel: ['🧳', '🗺️', '🏝️'],
  feelings: ['💛', '🫶', '🌤️'], jobs: ['🧑‍🍳', '🧑‍⚕️', '🧑‍🎨'], school: ['📚', '✏️', '🎒'], tech: ['💻', '🎧', '📱'], sports: ['⚽', '🏀', '🏆'],
  music: ['🎸', '🎹', '🎤'], tools: ['🔧', '🧰', '🪚'], body: ['💪', '👀', '🫀'], health: ['💊', '🩺', '🍎'], work: ['💼', '📈', '☕'],
  society: ['🏛️', '📰', '🗳️'], ideas: ['💡', '🔭', '🧪'], mix: ['☁️', '⭐', '🌙'],
};
