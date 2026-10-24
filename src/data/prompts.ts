import { dateKey } from './social';

/** "Topic of the day" for threads: everyone writes a few sentences in the language they learn. */
export type Prompt = { en: string; uk: string; min: 'A1' | 'A2' | 'B1' | 'B2' };

export const PROMPTS: Prompt[] = [
  { min: 'A1', en: 'Introduce yourself: name, city and one thing you love.', uk: 'Познайомся: ім’я, місто й одна річ, яку ти любиш.' },
  { min: 'A1', en: 'What did you eat for breakfast today?', uk: 'Що ти сьогодні їв(ла) на сніданок?' },
  { min: 'A1', en: 'Describe your room in three sentences.', uk: 'Опиши свою кімнату трьома реченнями.' },
  { min: 'A1', en: 'What colour is your favourite thing, and why?', uk: 'Якого кольору твоя улюблена річ і чому?' },
  { min: 'A1', en: 'Who is in your family? Tell us about one person.', uk: 'Хто є у твоїй родині? Розкажи про одну людину.' },
  { min: 'A1', en: 'What is the weather like where you are?', uk: 'Яка зараз погода там, де ти?' },
  { min: 'A1', en: 'Do you have a pet? Or which pet would you like?', uk: 'У тебе є тварина? Або яку б ти хотів(ла)?' },
  { min: 'A2', en: 'Describe your perfect weekend.', uk: 'Опиши свої ідеальні вихідні.' },
  { min: 'A2', en: 'What did you do yesterday evening?', uk: 'Що ти робив(ла) вчора ввечері?' },
  { min: 'A2', en: 'Tell us about a trip you remember.', uk: 'Розкажи про подорож, яку пам’ятаєш.' },
  { min: 'A2', en: 'What is a typical dish from your country? How is it made?', uk: 'Яка типова страва твоєї країни? Як її готують?' },
  { min: 'A2', en: 'What do you usually do on Sunday mornings?', uk: 'Що ти зазвичай робиш у неділю зранку?' },
  { min: 'A2', en: 'Describe your best friend without saying their name.', uk: 'Опиши найкращого друга, не називаючи імені.' },
  { min: 'A2', en: 'Which film or series did you watch last? Was it good?', uk: 'Який фільм чи серіал ти дивився(лася) останнім? Сподобався?' },
  { min: 'A2', en: 'What is in your bag right now?', uk: 'Що зараз у твоїй сумці?' },
  { min: 'A2', en: 'Write a short message inviting a friend to a café.', uk: 'Напиши коротке повідомлення-запрошення другу в кафе.' },
  { min: 'B1', en: 'Why are you learning this language? What is your goal?', uk: 'Чому ти вчиш цю мову? Яка твоя мета?' },
  { min: 'B1', en: 'What would you do with a free month and no money worries?', uk: 'Що б ти робив(ла) з вільним місяцем і без грошових турбот?' },
  { min: 'B1', en: 'Describe a tradition from your country to a foreigner.', uk: 'Опиши іноземцю традицію своєї країни.' },
  { min: 'B1', en: 'What is a word in your language that is hard to translate?', uk: 'Яке слово твоєї мови важко перекласти?' },
  { min: 'B1', en: 'Tell us about a mistake that taught you something.', uk: 'Розкажи про помилку, яка тебе чогось навчила.' },
  { min: 'B1', en: 'What does your ideal home look like?', uk: 'Який вигляд має твій ідеальний дім?' },
  { min: 'B1', en: 'Recommend a book, song or place — and say why.', uk: 'Порадь книжку, пісню чи місце — і поясни чому.' },
  { min: 'B1', en: 'What job would you love to try for one week?', uk: 'Яку роботу ти б хотів(ла) спробувати на тиждень?' },
  { min: 'B2', en: 'Is it better to live in a big city or a small town? Argue one side.', uk: 'Краще жити у великому місті чи маленькому? Захисти одну сторону.' },
  { min: 'B2', en: 'How has technology changed the way people learn languages?', uk: 'Як технології змінили те, як люди вчать мови?' },
  { min: 'B2', en: 'Describe a moment when you felt proud of yourself.', uk: 'Опиши момент, коли ти пишався(лася) собою.' },
  { min: 'B2', en: 'What advice would you give to your younger self?', uk: 'Яку пораду ти дав(ла) би собі молодшому(ій)?' },
  { min: 'B2', en: 'Which invention could the world live without?', uk: 'Без якого винаходу світ міг би обійтися?' },
  { min: 'B2', en: 'Tell a short story that starts with “I opened the door and…”.', uk: 'Напиши коротку історію, що починається з «Я відчинив(ла) двері й…».' },
];

/** The same prompt for everyone today (changes at midnight). */
export function promptOfDay(day = dateKey()): Prompt {
  const n = [...day].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 100003, 7);
  return PROMPTS[n % PROMPTS.length];
}
