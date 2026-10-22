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
  await page.goto('/map');
  await expect(page).toHaveURL(/onboarding/);
  await expect(page.getByText('Point.')).toBeVisible();
  expect(errs).toEqual([]);
});

for (const path of ['/learn', '/dictionary', '/explore', '/phrases', '/phrases/phrasal', '/grammar', '/grammar/to-be', '/tutor', '/streak', '/shop', '/premium', '/league', '/settings', '/word/strawberry', '/review', '/phrase-review']) {
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
