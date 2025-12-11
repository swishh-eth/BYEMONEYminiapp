// Supported Tokens for Voting
export const TOKENS = {
  byemoney: {
    name: 'BYEMONEY',
    symbol: 'BYEMONEY',
    address: '0xA12A532B0B7024b1D01Ae66a3b8cF77366c7dB07',
    chain: 'base',
    chainId: 8453,
  },
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    address: '0x0000000000000000000000000000000000000000',
    chain: 'base',
    chainId: 8453,
  },
  clanker: {
    name: 'Clanker',
    symbol: 'CLANKER',
    address: '0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb',
    chain: 'base',
    chainId: 8453,
  },
} as const;

// Default token (BYEMONEY)
export const TOKEN = TOKENS.byemoney;

// DexScreener URLs
export const DEXSCREENER = {
  tokenUrl: `https://dexscreener.com/base/${TOKEN.address}`,
  embedUrl: `https://dexscreener.com/base/${TOKEN.address}?embed=1&theme=dark&trades=0&info=0`,
  apiUrl: `https://api.dexscreener.com/latest/dex/tokens/${TOKEN.address}`,
} as const;

// Social Links
export const SOCIALS = {
  farcaster: 'https://warpcast.com/thosmur',
  telegram: 'https://t.me/byemoneycoin',
  dexscreener: DEXSCREENER.tokenUrl,
  basescan: `https://basescan.org/token/${TOKEN.address}`,
} as const;

// Navigation Pages
export const PAGES = [
  { id: 'vote', label: 'Vote' },
  { id: 'home', label: 'Chart' },
  { id: 'info', label: 'Info' },
] as const;