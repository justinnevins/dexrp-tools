export const XRPL_ENDPOINTS = {
  MAINNET_WS: import.meta.env.VITE_XRPL_MAINNET_WS || 'wss://xrplcluster.com',
  TESTNET_WS: import.meta.env.VITE_XRPL_TESTNET_WS || 'wss://s.altnet.rippletest.net:51233',
  MAINNET_WS_FULL_HISTORY: import.meta.env.VITE_XRPL_MAINNET_WS_FULL_HISTORY || 'wss://s1.ripple.com:51234',
  TESTNET_WS_FULL_HISTORY: import.meta.env.VITE_XRPL_TESTNET_WS_FULL_HISTORY || 'wss://s.altnet.rippletest.net:51234',
  MAINNET_HTTP: import.meta.env.VITE_XRPL_MAINNET_HTTP || 'https://s1.ripple.com:51234',
  TESTNET_HTTP: import.meta.env.VITE_XRPL_TESTNET_HTTP || 'https://s.altnet.rippletest.net:51234',
};

export const EXPLORER_URLS = {
  XRPSCAN_MAINNET: import.meta.env.VITE_XRPSCAN_MAINNET_URL || 'https://xrpscan.com',
  XRPSCAN_TESTNET: import.meta.env.VITE_XRPSCAN_TESTNET_URL || 'https://testnet.xrpscan.com',
};

export const PRICE_API = {
  INFTF_BASE_URL: import.meta.env.VITE_INFTF_API_URL || 'https://xrpldata.inftf.org/v1/iou/exchange_rates',
};

export const RLUSD_ISSUERS = {
  MAINNET: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De',
  TESTNET: 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV',
};

export const GATEHUB_ISSUERS = {
  USD_MAINNET: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
};

export const BITSTAMP_ISSUERS = {
  MAINNET: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
};

export const XRPL_RESERVES = {
  BASE_RESERVE: 10,
  INCREMENT_RESERVE: 2,
};

export const DEX_DEFAULTS = {
  SLIPPAGE_TOLERANCE: 0.02,
  DEFAULT_EXPIRATION_DAYS: 7,
};

export const CURRENCY_CODES = {
  RLUSD_HEX: '524C555344000000000000000000000000000000',
  USDC_HEX: '5553444300000000000000000000000000000000',
  SOLO_HEX: '534F4C4F00000000000000000000000000000000',
};

export const TOKEN_ISSUERS = {
  USDC_MAINNET: 'rGm7WCVp9gb4jZHWTEtGUr4dd74z2XuWhE',
  USDC_TESTNET: 'rHuGNhqTG32mfmAvWA8hUyWRLV3tCSwKQt',
  SOLO_MAINNET: 'rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz',
  CSC_MAINNET: 'rCSCManTZ8ME9EoLrSHHYKW8PPwWMgkwr',
};

interface CommonToken {
  name: string;
  currency: string;
  mainnetIssuer?: string;
  testnetIssuer?: string;
}

export const COMMON_TOKENS: CommonToken[] = [
  {
    name: 'Ripple USD (RLUSD)',
    currency: CURRENCY_CODES.RLUSD_HEX,
    mainnetIssuer: RLUSD_ISSUERS.MAINNET,
    testnetIssuer: RLUSD_ISSUERS.TESTNET,
  },
  {
    name: 'USD Coin (USDC)',
    currency: CURRENCY_CODES.USDC_HEX,
    mainnetIssuer: TOKEN_ISSUERS.USDC_MAINNET,
    testnetIssuer: TOKEN_ISSUERS.USDC_TESTNET,
  },
  {
    name: 'Bitstamp USD',
    currency: 'USD',
    mainnetIssuer: BITSTAMP_ISSUERS.MAINNET,
  },
  {
    name: 'Bitstamp BTC',
    currency: 'BTC',
    mainnetIssuer: BITSTAMP_ISSUERS.MAINNET,
  },
  {
    name: 'Bitstamp ETH',
    currency: 'ETH',
    mainnetIssuer: BITSTAMP_ISSUERS.MAINNET,
  },
  {
    name: 'GateHub EUR',
    currency: 'EUR',
    mainnetIssuer: GATEHUB_ISSUERS.USD_MAINNET,
  },
  {
    name: 'GateHub USD',
    currency: 'USD',
    mainnetIssuer: GATEHUB_ISSUERS.USD_MAINNET,
  },
  {
    name: 'GateHub GBP',
    currency: 'GBP',
    mainnetIssuer: GATEHUB_ISSUERS.USD_MAINNET,
  },
  {
    name: 'Sologenic (SOLO)',
    currency: CURRENCY_CODES.SOLO_HEX,
    mainnetIssuer: TOKEN_ISSUERS.SOLO_MAINNET,
  },
  {
    name: 'CasinoCoin (CSC)',
    currency: 'CSC',
    mainnetIssuer: TOKEN_ISSUERS.CSC_MAINNET,
  },
];
