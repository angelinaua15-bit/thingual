import type { CEFR } from './concepts';

/**
 * Tingo Stories: short scenes in which Tingo the fox meets people on his travels.
 * Every line is a phrase from the phrasebook, so each story exists in all 16 languages.
 * Questions are made automatically: "what did they say?" after their lines and
 * "what should Tingo say?" before his.
 */
export type Speaker = 'fox' | 'npc';
export type Story = {
  id: string;
  level: CEFR;
  scene: string;
  title: { en: string; uk: string };
  npc: { emoji: string; name: { en: string; uk: string } };
  lines: [Speaker, string][];
};

const p = (id: string) => id; // phrase ids without the "ph:" prefix

export const STORIES: Story[] = [
  {
    id: 'first-friend', level: 'A1', scene: '🏞️', title: { en: 'A new friend', uk: 'Новий друг' }, npc: { emoji: '👩', name: { en: 'Anna', uk: 'Анна' } },
    lines: [['npc', p('basics-hello')], ['fox', p('basics-good-morning')], ['npc', p('basics-whats-your-name')], ['fox', p('basics-nice-to-meet-you')], ['npc', p('basics-my-name-is')], ['npc', p('basics-where-from')], ['fox', p('basics-from-ukraine')], ['npc', p('basics-have-a-nice-day')], ['fox', p('basics-see-you-tomorrow')]],
  },
  {
    id: 'slowly-please', level: 'A1', scene: '🗺️', title: { en: 'Slowly, please!', uk: 'Повільніше, будь ласка!' }, npc: { emoji: '🧔', name: { en: 'Marco', uk: 'Марко' } },
    lines: [['fox', p('basics-excuse-me')], ['npc', p('basics-how-are-you')], ['fox', p('basics-dont-understand')], ['fox', p('basics-speak-slowly')], ['npc', p('basics-of-course')], ['fox', p('basics-what-does-this-mean')], ['npc', p('basics-dont-know')], ['fox', p('basics-thank-you-very-much')], ['npc', p('basics-youre-welcome')]],
  },
  {
    id: 'cafe-morning', level: 'A1', scene: '☕', title: { en: 'Morning coffee', uk: 'Ранкова кава' }, npc: { emoji: '🧑‍🍳', name: { en: 'the waiter', uk: 'офіціант' } },
    lines: [['fox', p('cafe-free-table')], ['npc', p('basics-yes')], ['fox', p('cafe-menu')], ['npc', p('cafe-recommend')], ['fox', p('cafe-coffee')], ['fox', p('cafe-with-milk')], ['npc', p('basics-of-course')], ['fox', p('cafe-delicious')], ['fox', p('cafe-bill')]],
  },
  {
    id: 'cafe-dinner', level: 'A2', scene: '🍽️', title: { en: 'Dinner for two', uk: 'Вечеря на двох' }, npc: { emoji: '🧑‍🍳', name: { en: 'the waiter', uk: 'офіціант' } },
    lines: [['fox', p('cafe-reservation')], ['npc', p('cafe-how-long')], ['fox', p('cafe-ready-to-order')], ['fox', p('cafe-vegetarian')], ['npc', p('cafe-meat')], ['fox', p('cafe-allergic-nuts')], ['npc', p('basics-no-problem')], ['fox', p('cafe-not-ordered')], ['npc', p('basics-sorry')], ['fox', p('cafe-pay-separately')]],
  },
  {
    id: 'new-jacket', level: 'A2', scene: '🛍️', title: { en: 'A new jacket', uk: 'Нова куртка' }, npc: { emoji: '🧑‍💼', name: { en: 'the shop assistant', uk: 'продавчиня' } },
    lines: [['npc', p('shopping-can-you-help')], ['fox', p('shopping-looking-for')], ['fox', p('shopping-try-on')], ['npc', p('shopping-fitting-room')], ['fox', p('shopping-too-small')], ['fox', p('shopping-another-size')], ['fox', p('shopping-fits')], ['fox', p('shopping-how-much')], ['fox', p('shopping-ill-take-it')], ['fox', p('shopping-receipt')]],
  },
  {
    id: 'market-deal', level: 'A2', scene: '🧺', title: { en: 'At the market', uk: 'На ринку' }, npc: { emoji: '👵', name: { en: 'Grandma Rosa', uk: 'бабуся Роза' } },
    lines: [['fox', p('shopping-just-looking')], ['fox', p('shopping-how-much')], ['fox', p('shopping-too-expensive')], ['fox', p('shopping-better-price')], ['npc', p('shopping-think-about-it')], ['fox', p('shopping-two-of-these')], ['fox', p('shopping-cash')], ['npc', p('basics-of-course')], ['fox', p('shopping-bag')], ['npc', p('basics-have-a-nice-day')]],
  },
  {
    id: 'lost-museum', level: 'A2', scene: '🏛️', title: { en: 'Where is the museum?', uk: 'Де музей?' }, npc: { emoji: '👮', name: { en: 'a police officer', uk: 'поліцейський' } },
    lines: [['fox', p('directions-excuse-me-help')], ['fox', p('directions-lost')], ['fox', p('directions-right-way')], ['npc', p('directions-go-back')], ['npc', p('directions-turn-right-lights')], ['fox', p('directions-is-it-far')], ['npc', p('directions-five-minutes')], ['npc', p('directions-opposite')], ['fox', p('basics-thank-you')]],
  },
  {
    id: 'pharmacy-run', level: 'A2', scene: '🏙️', title: { en: 'Looking for a pharmacy', uk: 'Шукаю аптеку' }, npc: { emoji: '🧑', name: { en: 'a passer-by', uk: 'перехожий' } },
    lines: [['fox', p('directions-near-here')], ['npc', p('directions-around-corner')], ['npc', p('directions-cross-street')], ['npc', p('directions-second-left')], ['fox', p('directions-show-map')], ['npc', p('directions-between')], ['fox', p('basics-thank-you-very-much')], ['npc', p('basics-good-luck')]],
  },
  {
    id: 'train-rome', level: 'A2', scene: '🚆', title: { en: 'The train to Rome', uk: 'Потяг до Рима' }, npc: { emoji: '🧑‍✈️', name: { en: 'the cashier', uk: 'касирка' } },
    lines: [['fox', p('transport-tickets-to')], ['npc', p('transport-one-way')], ['fox', p('transport-return')], ['fox', p('transport-next-train')], ['fox', p('transport-which-platform')], ['fox', p('transport-change-trains')], ['npc', p('basics-no')], ['fox', p('transport-window-seat')], ['fox', p('transport-on-time')]],
  },
  {
    id: 'airport-trouble', level: 'B1', scene: '✈️', title: { en: 'Trouble at the airport', uk: 'Пригода в аеропорту' }, npc: { emoji: '🧑‍💼', name: { en: 'the agent', uk: 'працівниця аеропорту' } },
    lines: [['fox', p('transport-flight-delayed')], ['fox', p('transport-check-in')], ['npc', p('basics-wait-a-moment')], ['fox', p('transport-which-gate')], ['fox', p('transport-baggage-claim')], ['fox', p('transport-suitcase-missing')], ['npc', p('basics-sorry')], ['fox', p('transport-taxi-stand')], ['fox', p('transport-take-me-address')]],
  },
  {
    id: 'hotel-checkin', level: 'A2', scene: '🏨', title: { en: 'Check-in', uk: 'Заселення' }, npc: { emoji: '🧑‍💼', name: { en: 'the receptionist', uk: 'адміністраторка' } },
    lines: [['fox', p('hotel-rooms-available')], ['fox', p('hotel-two-nights')], ['fox', p('hotel-price-per-night')], ['fox', p('hotel-breakfast-included')], ['npc', p('basics-yes')], ['fox', p('hotel-breakfast-time')], ['fox', p('hotel-wifi-password')], ['fox', p('hotel-elevator')], ['npc', p('basics-have-a-nice-day')]],
  },
  {
    id: 'hotel-night', level: 'B1', scene: '🌙', title: { en: 'A noisy night', uk: 'Галаслива ніч' }, npc: { emoji: '🧑‍💼', name: { en: 'the receptionist', uk: 'адміністратор' } },
    lines: [['fox', p('hotel-room-number')], ['fox', p('hotel-too-noisy')], ['fox', p('hotel-quieter-room')], ['npc', p('basics-wait-a-moment')], ['fox', p('hotel-no-hot-water')], ['fox', p('hotel-key-broken')], ['npc', p('basics-sorry')], ['fox', p('hotel-another-pillow')], ['fox', p('hotel-late-checkout')], ['npc', p('basics-no-problem')]],
  },
  {
    id: 'doctor', level: 'B1', scene: '🏥', title: { en: 'At the doctor’s', uk: 'У лікаря' }, npc: { emoji: '🧑‍⚕️', name: { en: 'Doctor Lee', uk: 'лікарка Лі' } },
    lines: [['fox', p('health-appointment')], ['npc', p('basics-how-are-you')], ['fox', p('health-feel-sick')], ['fox', p('health-headache')], ['fox', p('health-fever')], ['npc', p('health-how-long')], ['fox', p('health-since-yesterday')], ['npc', p('health-twice-a-day')], ['npc', p('health-after-meals')], ['fox', p('basics-thank-you')]],
  },
  {
    id: 'pharmacy', level: 'A2', scene: '💊', title: { en: 'Something for a cold', uk: 'Щось від застуди' }, npc: { emoji: '🧑‍⚕️', name: { en: 'the pharmacist', uk: 'фармацевтка' } },
    lines: [['fox', p('health-cold-medicine')], ['npc', p('health-how-long')], ['fox', p('health-sore-throat')], ['fox', p('health-cough')], ['fox', p('health-prescription')], ['npc', p('basics-no')], ['fox', p('health-allergic-penicillin')], ['npc', p('basics-no-problem')], ['fox', p('basics-thank-you-very-much')]],
  },
  {
    id: 'stolen-phone', level: 'B1', scene: '🚓', title: { en: 'The stolen phone', uk: 'Вкрадений телефон' }, npc: { emoji: '👮', name: { en: 'the police officer', uk: 'поліцейська' } },
    lines: [['fox', p('emergency-need-help')], ['fox', p('emergency-phone-stolen')], ['fox', p('emergency-police-station')], ['npc', p('basics-wait-a-moment')], ['fox', p('emergency-use-phone')], ['npc', p('basics-of-course')], ['fox', p('emergency-lost-passport')], ['fox', p('emergency-embassy')], ['npc', p('feelings-dont-worry')]],
  },
  {
    id: 'weekend-plans', level: 'A2', scene: '🌤️', title: { en: 'Weekend plans', uk: 'Плани на вихідні' }, npc: { emoji: '👩', name: { en: 'Anna', uk: 'Анна' } },
    lines: [['npc', p('smalltalk-how-was-day')], ['fox', p('smalltalk-good-day')], ['npc', p('smalltalk-weekend')], ['fox', p('smalltalk-nothing-much')], ['npc', p('smalltalk-coffee')], ['fox', p('smalltalk-sounds-good')], ['npc', p('smalltalk-meet-tomorrow')], ['fox', p('smalltalk-have-fun')], ['npc', p('smalltalk-take-care')]],
  },
  {
    id: 'party-chat', level: 'A2', scene: '🎉', title: { en: 'At a party', uk: 'На вечірці' }, npc: { emoji: '🧑‍🎤', name: { en: 'Leo', uk: 'Лео' } },
    lines: [['npc', p('smalltalk-first-time-here')], ['fox', p('basics-yes')], ['npc', p('smalltalk-like-it-here')], ['fox', p('smalltalk-love-it')], ['npc', p('smalltalk-what-do-you-do')], ['fox', p('smalltalk-student')], ['npc', p('smalltalk-hobbies')], ['fox', p('smalltalk-like-reading-travel')], ['npc', p('smalltalk-me-too')], ['fox', p('smalltalk-add-me')]],
  },
  {
    id: 'weather', level: 'A1', scene: '🌧️', title: { en: 'What weather!', uk: 'Ну й погода!' }, npc: { emoji: '👴', name: { en: 'Grandpa Tom', uk: 'дідусь Том' } },
    lines: [['npc', p('basics-good-morning')], ['fox', p('smalltalk-cold')], ['npc', p('smalltalk-rain')], ['fox', p('smalltalk-really')], ['npc', p('smalltalk-think-so')], ['fox', p('smalltalk-what-time')], ['npc', p('smalltalk-not-sure')], ['fox', p('basics-see-you-later')]],
  },
  {
    id: 'first-day', level: 'B1', scene: '💼', title: { en: 'First day at work', uk: 'Перший день на роботі' }, npc: { emoji: '👩‍💼', name: { en: 'the boss', uk: 'керівниця' } },
    lines: [['fox', p('work-new')], ['npc', p('work-colleague')], ['fox', p('basics-nice-to-meet-you')], ['fox', p('work-first')], ['npc', p('work-meeting')], ['fox', p('work-question')], ['npc', p('work-deadline')], ['fox', p('work-on-it')], ['npc', p('work-good-job')]],
  },
  {
    id: 'video-call', level: 'B1', scene: '💻', title: { en: 'The video call', uk: 'Відеодзвінок' }, npc: { emoji: '🧑‍💻', name: { en: 'Sam', uk: 'Сем' } },
    lines: [['npc', p('work-hear-me')], ['fox', p('work-mute')], ['npc', p('basics-sorry')], ['fox', p('work-share-screen')], ['npc', p('work-good-idea')], ['fox', p('work-disagree')], ['npc', p('work-later')], ['fox', p('work-email')], ['npc', p('work-break')]],
  },
  {
    id: 'evening-home', level: 'A1', scene: '🏠', title: { en: 'An evening at home', uk: 'Вечір удома' }, npc: { emoji: '👩‍🦰', name: { en: 'Mum', uk: 'мама' } },
    lines: [['fox', p('home-im-home')], ['fox', p('home-dinner')], ['npc', p('home-wash-hands')], ['fox', p('home-help-cook')], ['npc', p('home-set-table')], ['fox', p('home-salt')], ['fox', p('home-dishes')], ['npc', p('home-film')], ['fox', p('home-good-night')], ['npc', p('home-sweet-dreams')]],
  },
  {
    id: 'lazy-sunday', level: 'A2', scene: '🛋️', title: { en: 'Lazy Sunday', uk: 'Лінива неділя' }, npc: { emoji: '🧒', name: { en: 'little Max', uk: 'малий Макс' } },
    lines: [['npc', p('home-wake-up')], ['fox', p('home-slept-well')], ['npc', p('home-breakfast')], ['fox', p('home-remote')], ['npc', p('home-my-turn')], ['fox', p('home-volume')], ['npc', p('home-door')], ['fox', p('home-keys')]],
  },
  {
    id: 'bad-day', level: 'B1', scene: '🌧️', title: { en: 'A bad day', uk: 'Поганий день' }, npc: { emoji: '👩', name: { en: 'Anna', uk: 'Анна' } },
    lines: [['fox', p('feelings-how-feel')], ['npc', p('feelings-bad-mood')], ['npc', p('feelings-stressed')], ['fox', p('feelings-sorry-to-hear')], ['fox', p('feelings-understand')], ['fox', p('feelings-hug')], ['npc', p('feelings-grateful')], ['fox', p('feelings-be-fine')], ['npc', p('feelings-better')]],
  },
  {
    id: 'big-news', level: 'B1', scene: '🎊', title: { en: 'Big news', uk: 'Чудова новина' }, npc: { emoji: '🧑‍🎓', name: { en: 'Leo', uk: 'Лео' } },
    lines: [['npc', p('feelings-excited')], ['fox', p('smalltalk-really')], ['fox', p('basics-congratulations')], ['fox', p('feelings-proud')], ['npc', p('feelings-grateful')], ['fox', p('basics-cheers')], ['npc', p('smalltalk-thats-great')]],
  },
];

export const storyById = (id: string) => STORIES.find((s) => s.id === id);
