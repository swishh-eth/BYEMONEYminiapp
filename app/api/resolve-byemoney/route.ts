import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ============ Config ============
const CONTRACT_ADDRESS = (process.env.BYEMONEY_PREDICTION_CONTRACT_ADDRESS || '0x2937B3a1CA66cAe79E7230Efad2F5e801F99ade4') as `0x${string}`;
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
    name: 'currentMarketId',
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
    name: 'withdrawFees',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
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
      
      return NextResponse.json({ 
        status: 'pending',
        marketId: id.toString(),
        endTime: new Date(Number(endTime) * 1000).toISOString(),
        timeRemaining: `${hours}h ${minutes}m`,
        upPool: formatEther(upPool) + ' BYEMONEY',
        downPool: formatEther(downPool) + ' BYEMONEY',
        message: 'Market has not ended yet' 
      });
    }

    // ============ Market has ended - resolve it ============
    const currentPrice = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getPrice',
    });

    console.log(`[BYEMONEY] Resolving market ${id}...`);
    console.log(`[BYEMONEY] Start price: ${startPrice}, End price: ${currentPrice}`);

    // Step 1: Resolve the market
    const resolveHash = await walletClient.writeContract({
      chain: base,
      account,
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'resolveMarket',
    });

    await publicClient.waitForTransactionReceipt({ hash: resolveHash, confirmations: 1 });

    // Note: For BYEMONEY with sqrtPriceX96, lower price = UP, higher price = DOWN
    // But this log is just for display - the contract handles the actual logic
    const direction = currentPrice < startPrice ? 'UP' : 
                     currentPrice > startPrice ? 'DOWN' : 'TIE';

    console.log(`[BYEMONEY] Market ${id} resolved: ${direction}`);

    // Step 2: Check and withdraw fees AFTER resolving (fees are now accumulated)
    let feesTxHash = null;
    let feesWithdrawn = '0';
    
    try {
      const accumulatedFees = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getAccumulatedFees',
      });

      console.log(`[BYEMONEY] Accumulated fees after resolve: ${formatEther(accumulatedFees)} BYEMONEY`);

      if (accumulatedFees > 0n) {
        console.log(`[BYEMONEY] Withdrawing ${formatEther(accumulatedFees)} BYEMONEY in fees...`);
        
        feesTxHash = await walletClient.writeContract({
          chain: base,
          account,
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'withdrawFees',
        });

        await publicClient.waitForTransactionReceipt({ hash: feesTxHash, confirmations: 1 });
        feesWithdrawn = formatEther(accumulatedFees);
        console.log(`[BYEMONEY] Fees withdrawn successfully: ${feesWithdrawn} BYEMONEY`);
      } else {
        console.log('[BYEMONEY] No fees to withdraw');
      }
    } catch (feeError: any) {
      console.error('[BYEMONEY] Fee withdrawal failed:', feeError.message || feeError);
    }

    // Step 3: Start the next market
    console.log('[BYEMONEY] Starting next market...');
    
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

    // Get seed pool info
    const seedPool = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getSeedPool',
    });

    console.log(`[BYEMONEY] New market ${newMarketId} started`);

    return NextResponse.json({
      status: 'resolved_and_started',
      resolvedMarketId: id.toString(),
      newMarketId: newMarketId.toString(),
      resolveTxHash: resolveHash,
      startTxHash: startHash,
      feesTxHash,
      feesWithdrawn: feesWithdrawn + ' BYEMONEY',
      direction,
      upPool: formatEther(upPool) + ' BYEMONEY',
      downPool: formatEther(downPool) + ' BYEMONEY',
      seedPoolRemaining: formatEther(seedPool) + ' BYEMONEY',
      message: 'BYEMONEY market resolved and new market started'
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