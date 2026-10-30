/** Privacy policy and terms (Ukrainian + English). Edit CONTACT_EMAIL in src/config.ts before publishing in stores. */
type Doc = { title: string; updated: string; sections: { h: string; p: string[] }[] };

export const LEGAL: Record<'privacy' | 'terms', Record<'uk' | 'en', Doc>> = {
  privacy: {
    uk: {
      title: 'Політика конфіденційності',
      updated: 'Оновлено 24 жовтня 2026',
      sections: [
        { h: 'Коротко', p: ['Thingual працює без реєстрації. Ми збираємо мінімум даних, потрібних для навчання та спільноти, не продаємо їх і не показуємо рекламу.'] },
        { h: 'Що ми зберігаємо', p: [
          'Анонімний акаунт (випадковий ідентифікатор). Email — лише якщо ти сама/сам його додаси, щоб відновлювати прогрес на інших пристроях.',
          'Прогрес навчання: пройдені уроки шляху, слова, фрази, серія, іскри, кристали, налаштування — щоб синхронізувати їх між пристроями.',
          'Профіль спільноти: ім’я, нікнейм, опис, аватар, мови.',
          'Те, що ти робиш на Арені: результати дуелей, участь у зграї та голосові листівки (запис фрази дня, який ти сам надсилаєш). Діти до 13 років не публікують голос — їхні записи лишаються на пристрої. Ми не збираємо твоє місцезнаходження.',
          'Вікова група (не дата народження) — щоб застосовувати вікові обмеження.',
          'Звіти про помилки застосунку (текст помилки, адреса сторінки, тип браузера) — щоб виправляти збої.',
        ] },
        { h: 'Фото', p: [
          'Застосунок не користується камерою. Фото можна додати з галереї — до допису, аватара чи картки слова.',
          'Перед публікацією фото перевіряється AI-фільтром безпеки (Anthropic): зменшена копія надсилається лише для перевірки й не зберігається. Фото, які ти не публікуєш, лишаються на твоєму пристрої.',
        ] },
        { h: 'AI-співрозмовник', p: ['Повідомлення в тренуванні розмови надсилаються AI-моделі, щоб отримати відповідь, і не використовуються для реклами чи профілювання.'] },
        { h: 'Мікрофон і вимова', p: ['Коли ти тренуєш вимову, звук розпізнає служба мовлення твого пристрою (Apple або Google) за їхніми правилами. Ми не записуємо і не зберігаємо аудіо.'] },
        { h: 'Підписка Max', p: ['Покупки обробляють App Store / Google Play і сервіс RevenueCat: він отримує анонімний ідентифікатор акаунта та історію покупок, щоб вмикати Max на твоїх пристроях. Дані картки ми не бачимо.'] },
        { h: 'Сповіщення', p: ['Нагадування про серію — локальні сповіщення на твоєму пристрої; їх можна вимкнути в налаштуваннях.'] },
        { h: 'Де зберігаються дані', p: ['База даних і файли — Supabase (ЄС, Франкфурт). Сайт — Vercel. AI-обробка — Anthropic. Підписки — RevenueCat. Ці сервіси обробляють дані лише щоб застосунок працював.'] },
        { h: 'Твої права', p: [
          'Ти можеш експортувати свої дані та видалити акаунт у Налаштуваннях → Приватність. Видалення прибирає профіль, дописи й прогрес із сервера.',
          'Можна заблокувати користувача або поскаржитися на допис — скарги розглядаються.',
        ] },
        { h: 'Діти', p: ['Публікувати у спільноті можна з 13 років. Для молодших є сімейний режим без соціальних функцій.'] },
      ],
    },
    en: {
      title: 'Privacy policy',
      updated: 'Updated 24 October 2026',
      sections: [
        { h: 'In short', p: ['Thingual works without sign-up. We collect the minimum needed for learning and the community, never sell it and show no ads.'] },
        { h: 'What we store', p: [
          'An anonymous account (random id). An email only if you add one to restore progress on other devices.',
          'Learning progress — finished path lessons, words, phrases, streak, sparks, crystals, settings — to sync it between your devices.',
          'Your community profile: name, handle, bio, avatar, languages.',
          'What you do in the Arena: duel results, pack membership and voice postcards (a recording of the phrase of the day that you choose to send). Children under 13 can’t publish their voice — their recordings stay on the device. We don’t collect your location.',
          'Your age group (not your birth date) to apply age rules.',
          'App error reports (error text, page address, browser type) to fix crashes.',
        ] },
        { h: 'Photos', p: [
          'The app does not use the camera. You can add a photo from your gallery — to a post, your avatar or a word card.',
          'Before a photo is published it is checked by an AI safety filter (Anthropic): a smaller copy is sent only for the check and is not stored. Photos you don’t publish stay on your device.',
        ] },
        { h: 'AI conversation partner', p: ['Messages in conversation practice are sent to an AI model to get a reply and are not used for ads or profiling.'] },
        { h: 'Microphone and pronunciation', p: ['When you practise pronunciation, your device’s speech service (Apple or Google) recognises the audio under their terms. We don’t record or store audio.'] },
        { h: 'Max subscription', p: ['Purchases are handled by the App Store / Google Play and by RevenueCat, which receives an anonymous account id and purchase history to turn Max on across your devices. We never see your card details.'] },
        { h: 'Notifications', p: ['Streak reminders are local notifications on your device; you can turn them off in Settings.'] },
        { h: 'Where data lives', p: ['Database and files: Supabase (EU, Frankfurt). Website: Vercel. AI processing: Anthropic. Subscriptions: RevenueCat. They process data only to run the app.'] },
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
      updated: 'Оновлено 24 жовтня 2026',
      sections: [
        { h: 'Сервіс', p: ['Thingual допомагає вчити мови через шлях коротких уроків, практику та спільноту. Базові функції безкоштовні.'] },
        { h: 'Твій контент', p: [
          'Голосові листівки й фото, які ти публікуєш, лишаються твоїми. Публікуючи, ти дозволяєш показувати їх у застосунку (Арена, профіль). Реакції — лише наліпки; на листівку можна поскаржитися, після трьох скарг вона ховається.',
          'Публікуй лише те, що зняла/зняв сам(а) або маєш право поширювати.',
        ] },
        { h: 'Правила спільноти', p: [
          'Заборонено: оголена чи сексуальна натура, насильство, ненависть, цькування, спам, чужі персональні дані та документи.',
          'Порушення видаляються; за повторні — акаунт може бути заблоковано.',
        ] },
        { h: 'Thingual Max', p: ['Max — платна підписка (на місяць або рік), яку оформлюють через App Store чи Google Play. Ціну й період видно перед покупкою. Підписка продовжується автоматично, якщо не скасувати її щонайменше за 24 години до кінця періоду; керувати нею й скасувати можна в налаштуваннях акаунта магазину. Max діє до кінця оплаченого періоду.'] },
        { h: 'Відповідальність', p: ['Переклади й AI-відповіді можуть містити неточності. Не використовуй застосунок для медичних, юридичних чи екстрених рішень.'] },
        { h: 'Зміни', p: ['Ми можемо оновлювати ці умови; про важливі зміни повідомимо в застосунку.'] },
      ],
    },
    en: {
      title: 'Terms of use',
      updated: 'Updated 24 October 2026',
      sections: [
        { h: 'The service', p: ['Thingual helps you learn languages through a path of short lessons, practice and a community. Core features are free.'] },
        { h: 'Your content', p: [
          'Voice postcards and photos you publish remain yours. By posting you allow us to show them in the app (Arena, profile). Reactions are stickers only; any postcard can be reported and is hidden after three reports.',
          'Only post what you took yourself or have the right to share.',
        ] },
        { h: 'Community rules', p: [
          'Not allowed: nudity or sexual content, violence, hate, harassment, spam, other people’s personal data or documents.',
          'Violations are removed; repeated ones can get an account blocked.',
        ] },
        { h: 'Thingual Max', p: ['Max is a paid subscription (monthly or yearly) bought through the App Store or Google Play. The price and period are shown before you buy. It renews automatically unless cancelled at least 24 hours before the end of the period; manage or cancel it in your store account settings. Max stays active until the end of the paid period.'] },
        { h: 'Liability', p: ['Translations and AI replies can contain mistakes. Don’t rely on the app for medical, legal or emergency decisions.'] },
        { h: 'Changes', p: ['We may update these terms and will announce important changes in the app.'] },
      ],
    },
  },
};
