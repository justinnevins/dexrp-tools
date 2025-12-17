export const isNativeApp = (): boolean => {
  return false;
};

export const isWeb = (): boolean => {
  return true;
};

export const getPlatform = (): 'web' => {
  return 'web';
};
