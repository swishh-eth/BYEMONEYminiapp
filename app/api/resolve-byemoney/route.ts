import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ============ Config ============
const CONTRACT_ADDRESS = (process.env.BYEMONEY_PREDICTION_CONTRACT_ADDRESS || '') as `0x${string}`;
const RESOLVER_PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY as `0x${string}`;
const BASE_RPC = process.env.BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/jKHNMnfb18wYA1HfaHxo5';

const CONTRACT_ABI = [
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
    name: 'getNextMarket',
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
  {
    name: 'getPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getPriceInEth',
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
    name: 'nextMarketId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
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
    name: 'collectFees',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'accumulatedFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('[BYEMONEY] Unauthorized resolver attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!CONTRACT_ADDRESS) {
    return NextResponse.json({ 
      status: 'error',
      error: 'BYEMONEY_PREDICTION_CONTRACT_ADDRESS not configured' 
    }, { status: 500 });
  }

  if (!RESOLVER_PRIVATE_KEY) {
    return NextResponse.json({ 
      status: 'error',
      error: 'Resolver private key not configured' 
    }, { status: 500 });
  }

  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(BASE_RPC),
    });

    const account = privateKeyToAccount(RESOLVER_PRIVATE_KEY);
    
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(BASE_RPC),
    });

    // Check resolver wallet balance (only needs gas, no tokens)
    const balance = await publicClient.getBalance({ address: account.address });
    const balanceEth = Number(formatEther(balance));
    
    if (balanceEth < 0.0005) {
      console.log(`[BYEMONEY] Low resolver balance: ${balanceEth} ETH`);
      return NextResponse.json({ 
        status: 'warning',
        message: 'Resolver wallet balance low - need ETH for gas',
        balance: balanceEth,
        address: account.address
      });
    }

    // Get current market
    const market = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getCurrentMarket',
    });

    const [id, startPrice, , , endTime, upPool, downPool, status] = market;
    const isActive = status === 0;
    const isResolved = status === 1;

    // Get time remaining
    const timeRemaining = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getTimeRemaining',
    });

    // If no market exists, start one
    if (id === 0n) {
      console.log('[BYEMONEY] No market exists, starting new one...');
      
      const startHash = await walletClient.writeContract({
        chain: base,
        account,
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'startMarket',
      });

      await publicClient.waitForTransactionReceipt({ hash: startHash, confirmations: 1 });

      const newMarketId = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'currentMarketId',
      });

      console.log(`[BYEMONEY] New market ${newMarketId} started`);

      return NextResponse.json({
        status: 'started',
        marketId: newMarketId.toString(),
        txHash: startHash,
        message: 'New BYEMONEY market started'
      });
    }

    // If market is resolved, start a new one
    if (isResolved) {
      console.log('[BYEMONEY] Market resolved, starting new one...');
      
      const startHash = await walletClient.writeContract({
        chain: base,
        account,
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'startMarket',
      });

      await publicClient.waitForTransactionReceipt({ hash: startHash, confirmations: 1 });

      const newMarketId = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'currentMarketId',
      });

      console.log(`[BYEMONEY] New market ${newMarketId} started`);

      return NextResponse.json({
        status: 'started',
        marketId: newMarketId.toString(),
        txHash: startHash,
        message: 'New BYEMONEY market started after previous resolved'
      });
    }

    // If market hasn't ended yet
    if (timeRemaining > 0n) {
      const seconds = Number(timeRemaining);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      // Check if we need to start next market (betting closed on current)
      const bettingTimeRemaining = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getBettingTimeRemaining',
      });

      const nextMarketId = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'nextMarketId',
      });

      // If betting is closed and no next market, start one
      if (bettingTimeRemaining === 0n && nextMarketId === 0n) {
        console.log('[BYEMONEY] Betting closed, starting next market...');
        
        const startHash = await walletClient.writeContract({
          chain: base,
          account,
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'startMarket',
        });

        await publicClient.waitForTransactionReceipt({ hash: startHash, confirmations: 1 });

        const newNextMarketId = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'nextMarketId',
        });

        console.log(`[BYEMONEY] Next market ${newNextMarketId} started for pre-betting`);

        return NextResponse.json({
          status: 'next_market_started',
          currentMarketId: id.toString(),
          nextMarketId: newNextMarketId.toString(),
          txHash: startHash,
          timeRemaining: `${hours}h ${minutes}m`,
          message: 'Next market started for pre-betting'
        });
      }
      
      return NextResponse.json({ 
        status: 'pending',
        marketId: id.toString(),
        nextMarketId: nextMarketId.toString(),
        endTime: new Date(Number(endTime) * 1000).toISOString(),
        timeRemaining: `${hours}h ${minutes}m`,
        bettingOpen: bettingTimeRemaining > 0n,
        upPool: formatEther(upPool) + ' BYEMONEY',
        downPool: formatEther(downPool) + ' BYEMONEY',
        message: 'Market has not ended yet' 
      });
    }

    // Market has ended - resolve it
    const currentPrice = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getPrice',
    });

    console.log(`[BYEMONEY] Resolving market ${id}...`);
    console.log(`[BYEMONEY] Start price: ${startPrice}, End price: ${currentPrice}`);

    // Resolve the market
    const resolveHash = await walletClient.writeContract({
      chain: base,
      account,
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'resolveMarket',
    });

    await publicClient.waitForTransactionReceipt({ hash: resolveHash, confirmations: 1 });

    const direction = currentPrice > startPrice ? 'UP' : 
                     currentPrice < startPrice ? 'DOWN' : 'TIE';

    console.log(`[BYEMONEY] Market ${id} resolved: ${direction}`);

    // Check if next market was auto-promoted or needs to be started
    const newCurrentMarketId = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'currentMarketId',
    });

    // Get new market info
    const newMarket = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getCurrentMarket',
    });

    const newMarketStatus = newMarket[7];
    
    // If no active market after resolve, start one
    if (newMarketStatus !== 0) {
      console.log('[BYEMONEY] Starting new market after resolve...');
      
      const startHash = await walletClient.writeContract({
        chain: base,
        account,
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'startMarket',
      });

      await publicClient.waitForTransactionReceipt({ hash: startHash, confirmations: 1 });
      
      console.log('[BYEMONEY] New market started');
    }

    const finalMarketId = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'currentMarketId',
    });

    // Try to collect fees if any accumulated
    let feesCollected = '0';
    try {
      const fees = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'accumulatedFees',
      });

      if (fees > 0n) {
        console.log(`[BYEMONEY] Collecting ${formatEther(fees)} BYEMONEY in fees...`);
        
        const feeHash = await walletClient.writeContract({
          chain: base,
          account,
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'collectFees',
        });

        await publicClient.waitForTransactionReceipt({ hash: feeHash, confirmations: 1 });
        feesCollected = formatEther(fees);
        console.log(`[BYEMONEY] Fees collected: ${feesCollected} BYEMONEY`);
      }
    } catch (feeError) {
      console.log('[BYEMONEY] No fees to collect or fee collection failed');
    }

    return NextResponse.json({
      status: 'resolved',
      resolvedMarketId: id.toString(),
      newMarketId: finalMarketId.toString(),
      txHash: resolveHash,
      direction,
      upPool: formatEther(upPool) + ' BYEMONEY',
      downPool: formatEther(downPool) + ' BYEMONEY',
      feesCollected: feesCollected + ' BYEMONEY',
      message: 'BYEMONEY market resolved'
    });

  } catch (error: any) {
    console.error('[BYEMONEY] Resolver error:', error);
    
    let errorMessage = error.message || 'Unknown error';
    if (error.shortMessage) {
      errorMessage = error.shortMessage;
    }
    
    return NextResponse.json({ 
      status: 'error',
      error: errorMessage,
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}