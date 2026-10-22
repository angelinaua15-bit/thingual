/** Privacy policy and terms (Ukrainian + English). Edit CONTACT_EMAIL in src/config.ts before publishing in stores. */
type Doc = { title: string; updated: string; sections: { h: string; p: string[] }[] };

export const LEGAL: Record<'privacy' | 'terms', Record<'uk' | 'en', Doc>> = {
  privacy: {
    uk: {
      title: 'Політика конфіденційності',
      updated: 'Оновлено 22 жовтня 2026',
      sections: [
        { h: 'Коротко', p: ['Thingual працює без реєстрації. Ми збираємо мінімум даних, потрібних для навчання та спільноти, не продаємо їх і не показуємо рекламу.'] },
        { h: 'Що ми зберігаємо', p: [
          'Анонімний акаунт (випадковий ідентифікатор). Email — лише якщо ти сама/сам його додаси, щоб відновлювати прогрес на інших пристроях.',
          'Прогрес навчання: слова, фрази, серія, іскри, налаштування — щоб синхронізувати їх між пристроями.',
          'Профіль спільноти: ім’я, нікнейм, опис, аватар, мови.',
          'Дописи, які ти публікуєш: текст, фото, слово і місто. Координати округлюються приблизно до 2 км, точне місце ніколи не зберігається.',
          'Вікова група (не дата народження) — щоб застосовувати вікові обмеження.',
          'Звіти про помилки застосунку (текст помилки, адреса сторінки, тип браузера) — щоб виправляти збої.',
        ] },
        { h: 'Фото і камера', p: [
          'Розпізнавання в браузері відбувається на пристрої. Якщо пристрій не впізнав предмет, зменшена копія фото надсилається AI-моделі (Anthropic) лише для визначення слова і не зберігається.',
          'Перед публікацією фото перевіряється AI-фільтром безпеки. Фото, які ти не публікуєш, лишаються на твоєму пристрої.',
        ] },
        { h: 'AI-співрозмовник', p: ['Повідомлення в тренуванні розмови надсилаються AI-моделі, щоб отримати відповідь, і не використовуються для реклами чи профілювання.'] },
        { h: 'Де зберігаються дані', p: ['База даних і файли — Supabase (ЄС, Франкфурт). Сайт — Vercel. AI-обробка — Anthropic. Ці сервіси обробляють дані лише щоб застосунок працював.'] },
        { h: 'Твої права', p: [
          'Ти можеш експортувати свої дані та видалити акаунт у Налаштуваннях → Приватність. Видалення прибирає профіль, дописи й прогрес із сервера.',
          'Можна заблокувати користувача або поскаржитися на допис — скарги розглядаються.',
        ] },
        { h: 'Діти', p: ['Публікувати у спільноті можна з 13 років. Для молодших є сімейний режим без соціальних функцій.'] },
      ],
    },
    en: {
      title: 'Privacy policy',
      updated: 'Updated 22 October 2026',
      sections: [
        { h: 'In short', p: ['Thingual works without sign-up. We collect the minimum needed for learning and the community, never sell it and show no ads.'] },
        { h: 'What we store', p: [
          'An anonymous account (random id). An email only if you add one to restore progress on other devices.',
          'Learning progress — words, phrases, streak, sparks, settings — to sync it between your devices.',
          'Your community profile: name, handle, bio, avatar, languages.',
          'Posts you publish: text, photo, word and city. Coordinates are rounded to about 2 km; your exact location is never stored.',
          'Your age group (not your birth date) to apply age rules.',
          'App error reports (error text, page address, browser type) to fix crashes.',
        ] },
        { h: 'Photos and camera', p: [
          'In the browser, recognition runs on your device. If it can’t tell what the object is, a smaller copy of the photo is sent to an AI model (Anthropic) only to find the word, and is not stored.',
          'Before a photo is published it is checked by an AI safety filter. Photos you don’t publish stay on your device.',
        ] },
        { h: 'AI conversation partner', p: ['Messages in conversation practice are sent to an AI model to get a reply and are not used for ads or profiling.'] },
        { h: 'Where data lives', p: ['Database and files: Supabase (EU, Frankfurt). Website: Vercel. AI processing: Anthropic. They process data only to run the app.'] },
        { h: 'Your rights', p: [
          'Export your data or delete your account in Settings → Privacy. Deleting removes your profile, posts and progress from our servers.',
          'You can block people and report posts; reports are reviewed.',
        ] },
        { h: 'Children', p: ['Posting to the community requires age 13+. Younger learners can use family mode without social features.'] },
      ],
    },
  },
  terms: {
    uk: {
      title: 'Умови використання',
      updated: 'Оновлено 22 жовтня 2026',
      sections: [
        { h: 'Сервіс', p: ['Thingual допомагає вчити мови через предмети навколо, фрази та спільноту. Базові функції безкоштовні.'] },
        { h: 'Твій контент', p: [
          'Фото й тексти, які ти публікуєш, лишаються твоїми. Публікуючи, ти дозволяєш показувати їх у застосунку (стрічка, карта, Daily Drop).',
          'Публікуй лише те, що зняла/зняв сам(а) або маєш право поширювати.',
        ] },
        { h: 'Правила спільноти', p: [
          'Заборонено: оголена чи сексуальна натура, насильство, ненависть, цькування, спам, чужі персональні дані та документи.',
          'Порушення видаляються; за повторні — акаунт може бути заблоковано.',
        ] },
        { h: 'Thingual Max', p: ['Платна підписка з’явиться після релізу в App Store і Google Play. Оплата й скасування — через магазин застосунків; умови покажемо до покупки.'] },
        { h: 'Відповідальність', p: ['Переклади й AI-відповіді можуть містити неточності. Не використовуй застосунок для медичних, юридичних чи екстрених рішень.'] },
        { h: 'Зміни', p: ['Ми можемо оновлювати ці умови; про важливі зміни повідомимо в застосунку.'] },
      ],
    },
    en: {
      title: 'Terms of use',
      updated: 'Updated 22 October 2026',
      sections: [
        { h: 'The service', p: ['Thingual helps you learn languages through the things around you, phrases and a community. Core features are free.'] },
        { h: 'Your content', p: [
          'Photos and texts you publish remain yours. By posting you allow us to show them in the app (feed, map, Daily Drop).',
          'Only post what you took yourself or have the right to share.',
        ] },
        { h: 'Community rules', p: [
          'Not allowed: nudity or sexual content, violence, hate, harassment, spam, other people’s personal data or documents.',
          'Violations are removed; repeated ones can get an account blocked.',
        ] },
        { h: 'Thingual Max', p: ['The paid plan will open after release in the App Store and Google Play. Payment and cancellation go through the app store; terms are shown before purchase.'] },
        { h: 'Liability', p: ['Translations and AI replies can contain mistakes. Don’t rely on the app for medical, legal or emergency decisions.'] },
        { h: 'Changes', p: ['We may update these terms and will announce important changes in the app.'] },
      ],
    },
  },
};
