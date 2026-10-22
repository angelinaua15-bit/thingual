/** Web: no store purchases (Max is bought in the iOS / Android app; the free trial works everywhere). */
import type { PurchasesPackage } from 'react-native-purchases';

export const ENTITLEMENT = 'max';
export const billingAvailable = () => false;
export function useBilling() {}
export type Plan = { id: string; kind: 'annual' | 'monthly' | 'other'; price: string; perMonth?: string; pkg: PurchasesPackage };
export const getPlans = async (): Promise<Plan[]> => [];
export const buy = async (_plan: Plan): Promise<'ok' | 'cancelled' | 'error'> => 'error';
export const restore = async () => false;
