# Як опублікувати Thingual в App Store і Google Play

Усе нижче робиться один раз. Потрібні: комп’ютер з Node.js, акаунти Apple Developer і Google Play Console (вже є), акаунт Expo (безкоштовний, expo.dev).

## 0. Supabase (5 хвилин)
1. **Authentication → URL Configuration → Site URL:** `https://thingual.vercel.app`, і додай цю ж адресу в **Redirect URLs**.
2. **Authentication → Email Templates → Magic Link:** додай у текст листа рядок `Ваш код: {{ .Token }}` — тоді в застосунку на телефоні можна входити кодом із листа.

## 1. Перша збірка (EAS)
```bash
git pull
npm install
npx eas-cli@latest login          # акаунт expo.dev
npx eas-cli@latest init           # прив’яже проєкт, додасть projectId в app.json → закомить і запуш
npx eas-cli@latest build -p ios --profile production       # спитає вхід Apple ID, сам створить сертифікати
npx eas-cli@latest build -p android --profile production   # створить ключ підпису Android
```
Збірки йдуть у хмарі Expo ~15–25 хв; посилання з’являться в терміналі й на expo.dev.

> Якщо ідентифікатор `app.thingual` вже зайнятий в Apple/Google — заміни `ios.bundleIdentifier` і `android.package` в app.json (наприклад, `com.thingual.app`) і повтори збірку.

## 2. Тестування перед релізом
- **iPhone:** `npx eas-cli@latest submit -p ios --latest` → збірка з’явиться в TestFlight (App Store Connect → TestFlight). Встанови TestFlight на iPhone і перевір: камеру, словник, повторення, вимову, фрази, карту, публікацію фото.
- **Android:** у Play Console → Testing → Internal testing → завантаж `.aab` з EAS (або `eas submit -p android` після першого ручного завантаження).
- ⚠️ Для **нових особистих** акаунтів Google Play діє правило: перед публікацією потрібне **закрите тестування з 12+ тестувальниками протягом 14 днів**. Почни його якомога раніше (Testing → Closed testing).

## 3. App Store Connect
1. **Apps → + → New App:** платформа iOS, назва «Thingual: Learn Languages», мова — English або Українська, bundle ID з app.json, SKU `thingual`.
2. **App Information:** категорія Education (+ Travel), посилання на політику: `https://thingual.vercel.app/legal/privacy`.
3. **Pricing:** Free.
4. **App Privacy:** заповни за таблицею з `store/LISTING.md`.
5. **Версія 1.0:** скріншоти з `store/ios-6.9/` (по 3–7 на мову), опис, ключові слова, підзаголовок — з `store/LISTING.md`; збірку обрати з TestFlight.
6. **Age Rating:** відповіді → вийде 12+ (користувацький контент з модерацією).
7. **App Review Information:** скопіюй «Review notes» з `store/LISTING.md`. Логін не потрібен.
8. **Submit for Review.** Перевірка зазвичай 1–3 дні.

## 4. Google Play Console
1. **Create app:** назва Thingual, безкоштовна, застосунок.
2. **Store listing:** короткий і повний опис з `store/LISTING.md`, іконка 512×512 (`public/icon-512.png`), feature graphic `store/google-play-feature-*.png`, скріншоти з `store/android-phone/`.
3. **App content:** Privacy policy (посилання вище), Data safety (таблиця з LISTING.md), Content rating (анкета), Target audience 13+, Ads — немає.
4. **Release:** після закритого тесту → Production → завантаж `.aab` → Review.

## 5. Оновлення потім
- Зміни в коді → `npx eas-cli@latest build` + `submit` (номер збірки збільшується сам).
- Дрібні виправлення JS без перевірки магазинів: `npx eas-cli@latest update` (EAS Update).

## 6. Підписка Thingual Max (коли захочеш)
App Store Connect / Play Console → In-app purchases → підписки (місяць, рік, сімейна) → акаунт RevenueCat → ключі передати мені, і я підключу оплату.

## Payments (RevenueCat)

The app already contains the RevenueCat SDK (`src/lib/billing.ts`). Until the store keys are set it uses the RevenueCat **Test Store** key, so purchases can be tried in a development build (`eas build --profile development`) before publishing. Expo Go and the web version don't sell subscriptions.

1. In RevenueCat → **Product catalog → Entitlements** create an entitlement with identifier **`max`**.
2. **Products**: create `thingual_max_monthly` and `thingual_max_yearly` (in the Test Store now; later the same ids in App Store Connect and Google Play Console) and attach both to the `max` entitlement.
3. **Offerings**: in the `default` offering add two packages — **Monthly** ($monthly) and **Annual** ($annual) — with those products.
4. When the app is in the stores: add the App Store and Play Store apps in RevenueCat (bundle id / package `app.thingual`), then set the public SDK keys as EAS environment variables `EXPO_PUBLIC_RC_IOS_KEY` (starts with `appl_`) and `EXPO_PUBLIC_RC_ANDROID_KEY` (starts with `goog_`). Never put a secret key (`sk_…`) in the app.
