// BYEMONEY Token Constants
export const TOKEN = {
  name: 'BYEMONEY',
  symbol: 'BYEMONEY',
  address: '0xA12A532B0B7024b1D01Ae66a3b8cF77366c7dB07',
  chain: 'base',
  chainId: 8453,
  decimals: 18,
} as const;

// DexScreener URLs
export const DEXSCREENER = {
  tokenUrl: `https://dexscreener.com/base/${TOKEN.address}`,
  embedUrl: `https://dexscreener.com/base/${TOKEN.address}?embed=1&theme=dark&trades=0&info=0`,
  apiUrl: `https://api.dexscreener.com/latest/dex/tokens/${TOKEN.address}`,
} as const;

// Social Links (update these with real links)
export const SOCIALS = {
  twitter: 'https://twitter.com/byemoney',
  telegram: 'https://t.me/byemoney',
  dexscreener: DEXSCREENER.tokenUrl,
  basescan: `https://basescan.org/token/${TOKEN.address}`,
} as const;

// Navigation Pages
export const PAGES = [
  { id: 'home', label: 'Chart', icon: '📊' },
  { id: 'info', label: 'Info', icon: '💰' },
  { id: 'links', label: 'Links', icon: '🔗' },
] as const;
