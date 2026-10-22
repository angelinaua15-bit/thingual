import { useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PACKAGE_TYPE, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { useApp } from '../store/useApp';
import { ensureSession } from './api';

/**
 * Thingual Max payments through RevenueCat (App Store / Google Play).
 * Keys are public SDK keys. Until the store keys are set, the RevenueCat Test Store key is used,
 * so purchases can be tried in a development build before the app is published.
 */
const TEST_KEY = 'test_umMYLjMCnpTVMmrINHRijjpMUKi';
// release builds never fall back to the Test Store
const STORE_KEY = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_RC_IOS_KEY : process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
const KEY = STORE_KEY || (__DEV__ ? TEST_KEY : '');
export const ENTITLEMENT = 'max';

let ready = false;
export const billingAvailable = () => ready;

/** Copy the store's answer into the app: Max is on while the entitlement is active. */
function apply(info: CustomerInfo) {
  const e = info.entitlements.active[ENTITLEMENT];
  if (!e) return;
  const until = e.expirationDate ? new Date(e.expirationDate).getTime() : Date.now() + 100 * 365 * 864e5; // lifetime
  const st = useApp.getState();
  if (!st.maxUntil || st.maxUntil < until) useApp.setState({ maxUntil: until });
}

/** Mounted once at start-up. */
export function useBilling() {
  useEffect(() => {
    if (ready || !KEY) return;
    try {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
      Purchases.configure({ apiKey: KEY });
      ready = true;
      Purchases.addCustomerInfoUpdateListener(apply);
      // tie purchases to the Thingual account, so Max follows the learner to a new phone
      ensureSession()
        .then((uid) => (uid ? Purchases.logIn(uid) : null))
        .then((r) => r && apply(r.customerInfo))
        .catch(() => Purchases.getCustomerInfo().then(apply).catch(() => {}));
    } catch {
      ready = false;
    }
  }, []);
}

export type Plan = { id: string; kind: 'annual' | 'monthly' | 'other'; price: string; perMonth?: string; pkg: PurchasesPackage };

export async function getPlans(): Promise<Plan[]> {
  if (!ready) return [];
  const off = await Purchases.getOfferings();
  const pkgs = off.current?.availablePackages ?? [];
  return pkgs.map((p) => ({
    id: p.identifier,
    kind: p.packageType === PACKAGE_TYPE.ANNUAL ? 'annual' : p.packageType === PACKAGE_TYPE.MONTHLY ? 'monthly' : 'other',
    price: p.product.priceString,
    perMonth: p.packageType === PACKAGE_TYPE.ANNUAL ? p.product.pricePerMonthString ?? undefined : undefined,
    pkg: p,
  }));
}

/** 'ok' when Max is now active, 'cancelled' when the learner closed the store sheet. */
export async function buy(plan: Plan): Promise<'ok' | 'cancelled' | 'error'> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
    apply(customerInfo);
    return customerInfo.entitlements.active[ENTITLEMENT] ? 'ok' : 'error';
  } catch (e) {
    return (e as { userCancelled?: boolean }).userCancelled ? 'cancelled' : 'error';
  }
}

export async function restore(): Promise<boolean> {
  if (!ready) return false;
  try {
    const info = await Purchases.restorePurchases();
    apply(info);
    return !!info.entitlements.active[ENTITLEMENT];
  } catch {
    return false;
  }
}
