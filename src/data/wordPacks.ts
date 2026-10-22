import type { LangCode } from './languages';

/** Fun collections unlocked with crystals: words and sayings that make people smile. */
export type PackWord = { word: string; lang: LangCode; emoji: string; en: string; uk: string };
export type WordPack = { id: string; emoji: string; price: number; title: { en: string; uk: string }; sub: { en: string; uk: string }; words: PackWord[] };

export const WORD_PACKS: WordPack[] = [
  {
    id: 'untranslatable',
    emoji: '🫖',
    price: 60,
    title: { en: 'Untranslatable words', uk: 'Неперекладні слова' },
    sub: { en: 'Feelings other languages need a whole sentence for', uk: 'Почуття, для яких іншим мовам треба ціле речення' },
    words: [
      { word: 'estrenar', lang: 'es', emoji: '🎁', en: 'Spanish: to wear or use something for the very first time', uk: 'Іспанське: вдягнути чи використати щось уперше' },
      { word: 'la sobremesa', lang: 'es', emoji: '☕', en: 'Spanish: lingering at the table, chatting after a meal', uk: 'Іспанське: засидітися за столом і балакати після обіду' },
      { word: 'die Schadenfreude', lang: 'de', emoji: '😏', en: 'German: joy at someone else’s small misfortune', uk: 'Німецьке: радість від чужої невдачі' },
      { word: 'die Fernweh', lang: 'de', emoji: '✈️', en: 'German: an ache for faraway places', uk: 'Німецьке: туга за далекими краями' },
      { word: 'a saudade', lang: 'pt', emoji: '🌊', en: 'Portuguese: a deep longing for something or someone you love', uk: 'Португальське: глибока туга за кимось або чимось дорогим' },
      { word: 'il dolce far niente', lang: 'it', emoji: '🍋', en: 'Italian: the sweetness of doing nothing', uk: 'Італійське: солодке нічогонероблення' },
      { word: 'le dépaysement', lang: 'fr', emoji: '🧭', en: 'French: the feeling of being out of your element abroad', uk: 'Французьке: відчуття, що ти не у своїй тарілці в чужій країні' },
      { word: '木漏れ日', lang: 'ja', emoji: '🌳', en: 'Japanese (komorebi): sunlight filtering through leaves', uk: 'Японське (коморебі): сонце, що просвічує крізь листя' },
      { word: '積ん読', lang: 'ja', emoji: '📚', en: 'Japanese (tsundoku): buying books and letting them pile up unread', uk: 'Японське (цундоку): купувати книжки й не читати їх' },
      { word: 'die Waldeinsamkeit', lang: 'de', emoji: '🌲', en: 'German: the peaceful feeling of being alone in a forest', uk: 'Німецьке: спокій самотності в лісі' },
      { word: '눈치', lang: 'ko', emoji: '👀', en: 'Korean (nunchi): sensing the mood of a room without words', uk: 'Корейське (нунчі): відчувати настрій людей без слів' },
      { word: 'la flânerie', lang: 'fr', emoji: '🚶', en: 'French: strolling aimlessly through a city just to enjoy it', uk: 'Французьке: блукати містом без мети, просто насолоджуючись' },
    ],
  },
  {
    id: 'idioms',
    emoji: '🤪',
    price: 60,
    title: { en: 'Funny sayings of the world', uk: 'Смішні вирази світу' },
    sub: { en: 'Read them literally — then find out what they mean', uk: 'Прочитай буквально — а потім дізнайся, що вони означають' },
    words: [
      { word: 'Tomaten auf den Augen haben', lang: 'de', emoji: '🍅', en: '“To have tomatoes on your eyes” — not to notice the obvious', uk: '«Мати помідори на очах» — не помічати очевидного' },
      { word: 'Ich verstehe nur Bahnhof', lang: 'de', emoji: '🚉', en: '“I only understand ‘train station’” — I don’t understand a thing', uk: '«Я розумію лише „вокзал“» — нічого не розумію' },
      { word: 'estar en las nubes', lang: 'es', emoji: '☁️', en: '“To be in the clouds” — to daydream', uk: '«Бути в хмарах» — витати в хмарах' },
      { word: 'costar un ojo de la cara', lang: 'es', emoji: '👁️', en: '“To cost an eye of the face” — to be very expensive', uk: '«Коштувати око з обличчя» — бути дуже дорогим' },
      { word: 'avoir le cafard', lang: 'fr', emoji: '🪳', en: '“To have the cockroach” — to feel down', uk: '«Мати таргана» — сумувати, хандрити' },
      { word: 'il pleut des cordes', lang: 'fr', emoji: '🌧️', en: '“It’s raining ropes” — it’s pouring', uk: '«Дощить мотузками» — ллє як з відра' },
      { word: 'non è farina del tuo sacco', lang: 'it', emoji: '🌾', en: '“It’s not flour from your sack” — it’s not your own idea', uk: '«Це не борошно з твого мішка» — це не твоя ідея' },
      { word: 'pagar o pato', lang: 'pt', emoji: '🦆', en: '“To pay the duck” — to take the blame for someone else', uk: '«Заплатити за качку» — відповідати за чужу провину' },
      { word: 'nie mój cyrk, nie moje małpy', lang: 'pl', emoji: '🐒', en: '“Not my circus, not my monkeys” — not my problem', uk: '«Не мій цирк, не мої мавпи» — не моя справа' },
      { word: 'it’s raining cats and dogs', lang: 'en', emoji: '🐈', en: 'It’s raining very hard', uk: 'Ллє як з відра' },
      { word: 'bite off more than you can chew', lang: 'en', emoji: '🍔', en: 'To take on more than you can handle', uk: 'Взятися за більше, ніж можеш подужати' },
      { word: '猫の手も借りたい', lang: 'ja', emoji: '🐾', en: '“I’d even borrow a cat’s paws” — I’m incredibly busy', uk: '«Позичив би навіть котячі лапки» — страшенно зайнятий' },
    ],
  },
  {
    id: 'travelers',
    emoji: '🧳',
    price: 60,
    title: { en: 'Words that travelled', uk: 'Слова-мандрівники' },
    sub: { en: 'Everyday words with surprising passports', uk: 'Щоденні слова з несподіваним походженням' },
    words: [
      { word: 'robot', lang: 'en', emoji: '🤖', en: 'From Czech “robota” — forced labour (Karel Čapek, 1920)', uk: 'З чеської «robota» — панщина, тяжка праця (Карел Чапек, 1920)' },
      { word: 'ketchup', lang: 'en', emoji: '🍅', en: 'From Hokkien Chinese “kê-tsiap” — a fish sauce', uk: 'З китайського діалекту «ке-цяп» — рибний соус' },
      { word: 'safari', lang: 'en', emoji: '🦒', en: 'From Swahili — “journey”', uk: 'Із суахілі — «подорож»' },
      { word: 'shampoo', lang: 'en', emoji: '🧴', en: 'From Hindi “chāmpo” — press, massage', uk: 'З гінді «чампо» — масажувати' },
      { word: 'algebra', lang: 'en', emoji: '➗', en: 'From Arabic “al-jabr” — reunion of broken parts', uk: 'З арабської «аль-джабр» — з’єднання частин' },
      { word: 'avocado', lang: 'en', emoji: '🥑', en: 'From Nahuatl (Aztec) “āhuacatl”', uk: 'З мови науатль (ацтеків) «ауакатль»' },
      { word: 'sauna', lang: 'en', emoji: '🧖', en: 'From Finnish — the only Finnish word most people know', uk: 'З фінської — мабуть, найвідоміше фінське слово' },
      { word: 'kindergarten', lang: 'en', emoji: '🧒', en: 'From German — “children’s garden”', uk: 'З німецької — «дитячий садок»' },
      { word: 'tea', lang: 'en', emoji: '🍵', en: 'From Min Chinese “tê”; “chai” comes from Mandarin “chá”', uk: 'Із мінського діалекту китайської «те»; а «чай» — з мандаринського «ча»' },
      { word: 'zero', lang: 'en', emoji: '0️⃣', en: 'From Arabic “ṣifr” — empty (also gave us “cipher”)', uk: 'З арабської «сифр» — порожній (звідти ж «шифр»)' },
      { word: 'cookie', lang: 'en', emoji: '🍪', en: 'From Dutch “koekje” — little cake', uk: 'З нідерландської «кукьє» — тістечко' },
      { word: 'tycoon', lang: 'en', emoji: '💼', en: 'From Japanese “taikun” — great lord', uk: 'З японської «тайкун» — великий володар' },
    ],
  },
];

export const packById = (id: string) => WORD_PACKS.find((p) => p.id === id);

/** App colour themes (accent colour), unlocked with crystals. */
export const ACCENTS: { id: string; price: number; light: string; dark: string; name: { en: string; uk: string } }[] = [
  { id: 'classic', price: 0, light: '#3B5BDB', dark: '#7C9BFF', name: { en: 'Classic', uk: 'Класика' } },
  { id: 'mint', price: 40, light: '#0B8F6A', dark: '#38D9A9', name: { en: 'Mint', uk: 'М’ята' } },
  { id: 'sunset', price: 40, light: '#E8590C', dark: '#FFA94D', name: { en: 'Sunset', uk: 'Захід сонця' } },
  { id: 'sakura', price: 40, light: '#C2255C', dark: '#F783AC', name: { en: 'Sakura', uk: 'Сакура' } },
  { id: 'violet', price: 40, light: '#6741D9', dark: '#B197FC', name: { en: 'Violet', uk: 'Фіалка' } },
  { id: 'ocean', price: 40, light: '#0B7285', dark: '#3BC9DB', name: { en: 'Ocean', uk: 'Океан' } },
];

/** Daily time goals: minutes of active learning → bonus crystals. */
export const TIME_TIERS: { min: number; bonus: number }[] = [
  { min: 5, bonus: 3 },
  { min: 15, bonus: 5 },
  { min: 30, bonus: 10 },
  { min: 60, bonus: 15 },
];
/** one crystal for every 2 active minutes, up to 30 a day from time alone */
export const SECONDS_PER_CRYSTAL = 120;
export const DAILY_TIME_CAP = 30;

/** Crystals spent on a list of unlock ids ('accent:mint', 'pack:idioms'). */
export const spentOn = (unlocks: string[] = []) =>
  unlocks.reduce((sum, u) => {
    const [kind, id] = u.split(':');
    const price = kind === 'accent' ? ACCENTS.find((a) => a.id === id)?.price : kind === 'pack' ? packById(id)?.price : 0;
    return sum + (price ?? 0);
  }, 0);
