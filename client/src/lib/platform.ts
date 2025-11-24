import { Capacitor } from '@capacitor/core';

export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const isWeb = (): boolean => {
  return !Capacitor.isNativePlatform();
};

export const getPlatform = (): 'ios' | 'android' | 'web' => {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios' || platform === 'android') {
    return platform;
  }
  return 'web';
};
