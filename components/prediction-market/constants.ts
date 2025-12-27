// Contract Addresses - NEW (active for new bets)
export const ETH_CONTRACT_ADDRESS = '0x473BaD200A9830f7bFF3d947f20B2a21C06Da126' as `0x${string}`;
export const BYEMONEY_CONTRACT_ADDRESS = '0xF25743149142579c6d9040D807D1493A817336A6' as `0x${string}`;

// Contract Addresses - OLD (for legacy claims)
export const ETH_CONTRACT_ADDRESS_OLD = '0xf8e98EB6e3A08eD857920b9d8283E731a360B689' as `0x${string}`;
export const BYEMONEY_CONTRACT_ADDRESS_OLD = '0x2937B3a1CA66cAe79E7230Efad2F5e801F99ade4' as `0x${string}`;

// Token address
export const BYEMONEY_TOKEN_ADDRESS = '0xA12A532B0B7024b1D01Ae66a3b8cF77366c7dB07' as `0x${string}`;

// Pricing Constants
export const BASE_TICKET_PRICE_ETH = 0.001;
export const BASE_TICKET_PRICE_BYEMONEY = 1000000n * 10n ** 18n; // 1M BYEMONEY per ticket
export const LOCK_PERIOD_SECONDS = 60 * 60; // 1 hour before end = locked
export const HOUSE_FEE = 0.05; // 5%

// Price Conversion Constants
export const Q96 = 2 ** 96;
export const BYEMONEY_PRICE_CALIBRATION = 1;

// Available Markets
export const AVAILABLE_COINS = [
  { symbol: 'ETH', name: 'Ethereum', icon: '/eth.png', active: true },
  { symbol: 'BYEMONEY', name: 'ByeMoney', icon: '/byemoney.png', active: true },
] as const;

// ETH Market ABI (V2/V3 - Chainlink price, new fee structure)
export const ETH_CONTRACT_ABI = [
  {
    name: 'getCurrentMarket',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'startPrice', type: 'uint256' },
      { name: 'endPrice', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'upPool', type: 'uint256' },
      { name: 'downPool', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'result', type: 'uint8' },
      { name: 'totalTickets', type: 'uint256' },
    ],
  },
  {
    name: 'getMarket',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'startPrice', type: 'uint256' },
      { name: 'endPrice', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'upPool', type: 'uint256' },
      { name: 'downPool', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'result', type: 'uint8' },
      { name: 'totalTickets', type: 'uint256' },
    ],
  },
  {
    name: 'getPosition',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'up', type: 'uint256' },
      { name: 'down', type: 'uint256' },
      { name: 'claimed', type: 'bool' },
    ],
  },
  {
    name: 'buyTickets',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'direction', type: 'uint8' }],
    outputs: [],
  },
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isBettingOpen',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getTimeRemaining',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getBettingTimeRemaining',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'currentMarketId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getSeedPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAccumulatedFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'config',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'ticketPrice', type: 'uint256' },
      { name: 'roundDuration', type: 'uint256' },
      { name: 'lockPeriod', type: 'uint256' },
      { name: 'paused', type: 'bool' },
    ],
  },
  // Resolver functions
  {
    name: 'resolveMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'startMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const;

// BYEMONEY Market ABI (V4/V5 - Uniswap V4 price, new fee structure)
export const BYEMONEY_CONTRACT_ABI = [
  {
    name: 'getCurrentMarket',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'startPrice', type: 'uint256' },
      { name: 'endPrice', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'upPool', type: 'uint256' },
      { name: 'downPool', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'result', type: 'uint8' },
      { name: 'totalTickets', type: 'uint256' },
    ],
  },
  {
    name: 'getMarket',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'startPrice', type: 'uint256' },
      { name: 'endPrice', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'upPool', type: 'uint256' },
      { name: 'downPool', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'result', type: 'uint8' },
      { name: 'totalTickets', type: 'uint256' },
    ],
  },
  {
    name: 'getPosition',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'up', type: 'uint256' },
      { name: 'down', type: 'uint256' },
      { name: 'claimed', type: 'bool' },
    ],
  },
  {
    name: 'buyTickets',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'direction', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isBettingOpen',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getTimeRemaining',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getBettingTimeRemaining',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getSeedPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAccumulatedFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'config',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'ticketPrice', type: 'uint256' },
      { name: 'roundDuration', type: 'uint256' },
      { name: 'lockPeriod', type: 'uint256' },
      { name: 'paused', type: 'bool' },
    ],
  },
  // Resolver functions
  {
    name: 'resolveMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'startMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const;

// ERC20 ABI for BYEMONEY token approval
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;