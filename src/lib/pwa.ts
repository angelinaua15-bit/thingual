/** Native apps are already installed. */
export const canInstall = () => false;
export const isIOSWeb = () => false;
export const isStandalone = () => true;
export async function promptInstall() { return false; }
export function useInstallable() { return false; }
