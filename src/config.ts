/** Public client config. The publishable key is safe to ship in the app — access is enforced by Row Level Security. */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dweburkagwzsntmyzslq.supabase.co';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_kd4hha9a3rLDYcEOMbCsgw_891vVskB';
/** Contact address shown in the privacy policy and terms (required by App Store / Google Play). */
export const CONTACT_EMAIL = process.env.EXPO_PUBLIC_CONTACT_EMAIL || 'thingual.app@gmail.com';
