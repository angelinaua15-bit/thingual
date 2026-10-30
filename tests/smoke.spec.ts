import { test, expect, type Page } from '@playwright/test';

/** A signed-in learner with a few words, a streak and sparks. */
const seed = () => {
  const now = Date.now();
  const day = (n: number) => { const d = new Date(now - n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const card = { due: new Date(now - 1000).toISOString(), stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0, state: 0 };
  const words = Object.fromEntries(['cup', 'window', 'cat', 'strawberry', 'guitar'].map((id) => [id, { conceptId: id, photo: '', addedAt: now, place: 'home', source: 'camera', card, lapses: 0 }]));
  return JSON.stringify({
    state: {
      onboarded: true,
      settings: { theme: 'light', uiLang: 'uk', native: 'uk', targets: ['es'], active: 'es', level: 'beginner', dailyMinutes: 5, voice: 'female', slowVoice: false, notify: { drop: true, review: true, friends: true, weekly: true, reviewHour: 19 }, sounds: true, haptics: true, reduceMotion: true, weeklyFriendsSummary: true },
      profile: { id: 'u-test', nickname: 'TestFox', createdAt: now },
      words, collections: [], history: [], learnStreak: { count: 6, last: day(1) }, dropStreak: { count: 0 }, freezesUsedWeek: { week: '', used: 0 },
      bestStreak: 6, activeDays: [day(1)], frozenDays: [], sparks: 260, freezes: 1, claimed: [3], flames: ['classic'], flame: 'classic',
      drops: {}, achievements: [], familyMode: { enabled: false }, exprs: { 'ph:cafe-menu': { card, addedAt: now } }, quests: { day: '', claimed: [] }, weekXp: { week: '', xp: 0 }, grammar: {},
      notebook: { 'n-test': { id: 'n-test', word: 'la libertad', lang: 'es', translation: 'свобода', ipa: '/li.βeɾˈtað/', pos: 'іменник', association: 'Ліберте! — кричать на свободі.', example: 'Amo la libertad.', exampleTr: 'Я люблю свободу.', emoji: '🕊️', done: false, createdAt: now, updatedAt: now, card } }, noteTomb: {},
    },
    version: 3,
  });
};

const errors = (page: Page) => {
  const list: string[] = [];
  page.on('pageerror', (e) => list.push(e.message));
  return list;
};

test('new visitor lands in onboarding, even from a deep link', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/arena');
  await expect(page).toHaveURL(/onboarding/);
  await expect(page.getByText('Learn.')).toBeVisible();
  expect(errs).toEqual([]);
});

for (const path of ['/lightning', '/stories', '/story?id=cafe-morning', '/wardrobe', '/path', '/arena', '/duel?friend=1', '/team', '/voices', '/lesson?node=u0-0', '/lesson?node=u0-2', '/lesson?node=u0-5', '/hearts', '/learn', '/dictionary', '/explore', '/phrases', '/phrases/phrasal', '/grammar', '/grammar/to-be', '/tutor', '/streak', '/shop', '/premium', '/league', '/settings', '/word/strawberry', '/review', '/phrase-review', '/notebook', '/notebook/edit', '/notebook/n-test', '/notebook/practice', '/books']) {
  test(`renders ${path} without crashing`, async ({ page }) => {
    const errs = errors(page);
    await page.goto('/');
    await page.evaluate((s) => localStorage.setItem('thingual-v1', s), seed());
    await page.goto(path);
    await page.waitForTimeout(1500);
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.getByText('Щось пішло не так')).toHaveCount(0);
    expect(errs).toEqual([]);
  });
}

test('a friend duel round can be played to the end', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('thingual-v1', s), seed());
  await page.goto('/duel?friend=1');
  await page.getByText('Зіграти свій раунд', { exact: false }).click();
  for (let k = 0; k < 10; k++) {
    await page.getByTestId('opt-0').click({ timeout: 8000 });
    await page.waitForTimeout(900);
  }
  await expect(page.getByText('Надіслати виклик', { exact: false })).toBeVisible();
  await expect(page.getByText('Правильно:', { exact: false })).toBeVisible();
  expect(errs).toEqual([]);
});

test('arena shows the journey, duels, packs and postcards', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('thingual-v1', s), seed());
  await page.goto('/arena');
  await expect(page.getByText('Подорож Тінґо', { exact: false })).toBeVisible();
  await expect(page.getByText('Дуель 1 на 1')).toBeVisible();
  await expect(page.getByText('Записати свою', { exact: false })).toBeVisible();
  expect(errs).toEqual([]);
});

test('review session can be answered', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('thingual-v1', s), seed());
  await page.goto('/phrase-review');
  await page.getByText('Показати').click();
  await page.getByText('Добре').click();
  await expect(page.getByText('Сесію завершено')).toBeVisible();
});

test('sign-in is reachable from onboarding on a new device', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/signin');
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/signin/);
  expect(errs).toEqual([]);
});

test('free user hitting a locked grammar level sees Max', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('thingual-v1', s), seed());
  await page.goto('/grammar');
  await page.getByText('Present Continuous', { exact: false }).first().click();
  await expect(page).toHaveURL(/premium\?reason=grammar/);
});

test('My vocabulary: add a word and mark it learned', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('thingual-v1', s), seed());
  await page.goto('/notebook/edit');
  await page.getByPlaceholder('свобода, la libertad…').fill('la esperanza');
  await page.getByPlaceholder('Що означає').fill('надія');
  await page.getByText('Зберегти', { exact: true }).last().click();
  await expect(page).toHaveURL(/notebook\/n-/);
  await expect(page.getByText('la esperanza')).toBeVisible();
  // the first word of the day may complete a streak milestone → close the celebration
  const next = page.getByText('Далі', { exact: true });
  await next.click({ timeout: 3000 }).catch(() => {});
  await page.getByText('Позначити вивченим').click();
  await expect(page.getByText('Повернути у вивчення')).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('thingual-v1')!).state.notebook);
  const added = Object.values(stored as Record<string, { word: string; done: boolean }>).find((w) => w.word === 'la esperanza');
  expect(added?.done).toBe(true);
  expect(errs).toEqual([]);
});

test('audiobook plays, saves progress and moves to the next chapter', async ({ page }) => {
  const errs = errors(page);
  // chapter list is bundled with the app — no metadata request should be needed
  await page.route('**/archive.org/metadata/**', (r) => r.abort());
  await page.route('**/archive.org/download/**', (r) => r.fulfill({ contentType: 'audio/mpeg', path: 'tests/fixtures/tone.mp3' }));
  await page.route('**/archive.org/services/**', (r) => r.abort());
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('thingual-v1', s), seed());
  await page.goto('/books/fabulas_esopo_01_librivox');
  await expect(page.getByText('El águila, el cuervo y el pastor').first()).toBeVisible();
  await page.getByLabel('play').first().click();
  await page.waitForTimeout(6500);
  const books = await page.evaluate(() => JSON.parse(localStorage.getItem('thingual-v1')!).state.books);
  expect(books['fabulas_esopo_01_librivox'].done).toContain(0);
  expect(books['fabulas_esopo_01_librivox'].chapter).toBe(1);
  expect(errs).toEqual([]);
});

test('My vocabulary fills a known word from the built-in dictionary (no AI)', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('thingual-v1', s), seed());
  await page.goto('/notebook/edit');
  await page.getByPlaceholder('свобода, la libertad…').fill('кіт');
  await page.getByText('Підставити').first().click();
  await expect(page.getByPlaceholder('свобода, la libertad…')).toHaveValue('el gato');
  await expect(page.getByPlaceholder('Що означає')).toHaveValue('кіт');
  expect(errs).toEqual([]);
});

test('Max-only pages stay closed for a free learner', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('thingual-v1', s), seed());
  // a locked book: never opens the player
  await page.goto('/books/niebla_1701_librivox');
  await expect(page.getByText('Усі книги — у Max').first()).toBeVisible();
  await expect(page.getByLabel('play')).toHaveCount(0);
  // a locked topic: back to all words + the Max page
  await page.goto('/explore?topic=work');
  await expect(page).toHaveURL(/premium/);
  // a locked phrasebook situation
  await page.goto('/phrases');
  await page.getByText('Покупки', { exact: true }).first().click();
  await expect(page).toHaveURL(/premium\?reason=phrases/);
});

test('crystals buy a colour theme and keep an honest ledger', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/');
  await page.evaluate((s) => {
    const st = JSON.parse(s);
    st.state.crystals = 74;
    st.state.unlocks = ['pack:idioms'];
    localStorage.setItem('thingual-v1', JSON.stringify(st));
  }, seed());
  await page.goto('/crystals');
  await page.getByText('М’ята', { exact: true }).or(page.getByText("М'ята", { exact: true })).first().click();
  await expect(page.getByText('34', { exact: true }).first()).toBeVisible();
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('thingual-v1')!).state);
  expect(st.unlocks).toContain('accent:mint');
  expect(st.settings.accent).toBe('mint');
  expect(errs).toEqual([]);
});

test('a path lesson checks answers and takes a heart for a mistake', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('thingual-v1', s), seed());
  await page.goto('/lesson?node=u0-0');
  await expect(page.getByText('Нове слово').first()).toBeVisible();
  // pick the first picture and check it
  await page.getByText('Перевірити').first().isVisible();
  const cards = page.locator('div[tabindex="0"]').filter({ has: page.locator('img') });
  await cards.nth(0).click();
  await page.getByText('Перевірити').click();
  await expect(page.getByText('Продовжити')).toBeVisible();
  const wrong = await page.getByText('Не зовсім').isVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('thingual-v1')!).state.hearts?.n ?? 5)).toBe(wrong ? 4 : 5);
  await page.getByText('Продовжити').click();
  await expect(page.getByText('Перевірити')).toBeVisible();
  expect(errs).toEqual([]);
});

test('the chest on the path gives crystals once', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/');
  await page.evaluate((s) => {
    const st = JSON.parse(s);
    st.state.settings.cefr = 'A1';
    st.state.crystals = 5;
    st.state.path = { 'es:u0-0': 1, 'es:u0-1': 1, 'es:u0-2': 1 };
    localStorage.setItem('thingual-v1', JSON.stringify(st));
  }, seed());
  await page.goto('/path');
  await page.getByLabel('chest current').click();
  await page.getByText('Відкрити', { exact: true }).click();
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('thingual-v1')!).state);
  expect(st.crystals).toBe(15);
  expect(st.path['es:c:A1-people-1']).toBe(1);
  expect(errs).toEqual([]);
});

test('Tingo’s wardrobe: try on, buy with crystals, wear', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/');
  await page.evaluate((s) => { const st = JSON.parse(s); st.state.crystals = 100; localStorage.setItem('thingual-v1', JSON.stringify(st)); }, seed());
  await page.goto('/wardrobe');
  await page.getByText('Циліндр', { exact: true }).click();
  await page.getByText(/Купити: Циліндр/).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('thingual-v1')!).state.crystals)).toBe(30);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('thingual-v1')!).state);
  expect(st.foxLook.hat).toBe('tophat');
  expect(st.unlocks).toContain('fox:tophat');
  expect(errs).toEqual([]);
});

test('a Tingo story plays line by line and asks questions', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('thingual-v1', s), seed());
  await page.goto('/story?id=cafe-morning');
  await expect(page.getByText('¿Está libre esta mesa?')).toBeVisible();
  await page.getByText('Продовжити').click();
  await expect(page.getByText(/Що сказав\(ла\) офіціант\?/)).toBeVisible();
  await page.getByText('Так.', { exact: true }).first().click();
  await page.getByText('Продовжити').click();
  expect(errs).toEqual([]);
});

test('Lightning starts a 60-second round and counts answers', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('thingual-v1', s), seed());
  await page.goto('/lightning');
  await page.getByText('Погнали!').click();
  await expect(page.getByText('60').or(page.getByText('59')).first()).toBeVisible();
  expect(errs).toEqual([]);
});

test('My mistakes: a lesson from words answered wrong, wins a heart back', async ({ page }) => {
  const errs = errors(page);
  await page.goto('/');
  await page.evaluate((s) => {
    const st = JSON.parse(s);
    st.state.mistakes = { cat: { n: 2, at: 1 }, cup: { n: 1, at: 2 }, window: { n: 3, at: 3 }, bread: { n: 1, at: 4 } };
    localStorage.setItem('thingual-v1', JSON.stringify(st));
  }, seed());
  await page.goto('/learn');
  await page.getByText(/Мої помилки · 4/).click();
  await expect(page).toHaveURL(/lesson\?node=mistakes/);
  await expect(page.getByText('Перевірити').or(page.getByText('Знайди пари')).first()).toBeVisible();
  expect(errs).toEqual([]);
});

test('old progress (position ids) moves to stable lesson ids', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((s) => { const st = JSON.parse(s); st.state.path = { 'es:u0-0': 1, 'es:u0-3': 1 }; localStorage.setItem('thingual-v1', JSON.stringify(st)); }, seed());
  await page.goto('/path');
  await page.waitForTimeout(1200);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('thingual-v1')!));
  expect(st.version).toBe(4);
  expect(st.state.path['es:l:family']).toBe(1);
  expect(st.state.path['es:c:A1-people-1']).toBe(1);
});
