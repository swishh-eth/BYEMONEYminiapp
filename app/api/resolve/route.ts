import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ============ Config ============
const CONTRACT_ADDRESS = (process.env.PREDICTION_CONTRACT_ADDRESS || '0x473BaD200A9830f7bFF3d947f20B2a21C06Da126') as `0x${string}`;
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
    name: 'withdrawFees',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'getAccumulatedFees',
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
    console.log('[ETH] Unauthorized resolver attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Check resolver wallet balance (only needs gas now, no seeding)
    const balance = await publicClient.getBalance({ address: account.address });
    const balanceEth = Number(formatEther(balance));
    
    if (balanceEth < 0.001) {
      console.log(`[ETH] Low resolver balance: ${balanceEth} ETH`);
      return NextResponse.json({ 
        status: 'warning',
        message: 'Resolver wallet balance low - need ETH for gas',
        balance: balanceEth,
        address: account.address
      });
    }

    // Check and withdraw any accumulated fees first (on every run)
    let earlyFeesTxHash = null;
    let earlyFeesWithdrawn = '0';
    try {
      const accumulatedFees = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getAccumulatedFees',
      });

      if (accumulatedFees > 0n) {
        console.log(`[ETH] Found ${formatEther(accumulatedFees)} ETH in accumulated fees, withdrawing...`);
        
        earlyFeesTxHash = await walletClient.writeContract({
          chain: base,
          account,
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'withdrawFees',
        });

        await publicClient.waitForTransactionReceipt({ hash: earlyFeesTxHash, confirmations: 1 });
        earlyFeesWithdrawn = formatEther(accumulatedFees);
        console.log(`[ETH] Fees withdrawn successfully: ${earlyFeesWithdrawn} ETH`);
      }
    } catch (feeError: any) {
      console.log('[ETH] Fee check/withdrawal skipped:', feeError.message || feeError);
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
      console.log('[ETH] No market exists, starting new one...');
      
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

      console.log(`[ETH] New market ${newMarketId} started`);

      return NextResponse.json({
        status: 'started',
        marketId: newMarketId.toString(),
        txHash: startHash,
        seedPoolRemaining: formatEther(seedPool),
        message: 'New ETH market started'
      });
    }

    // If market is resolved, start a new one
    if (isResolved) {
      console.log('[ETH] Market resolved, starting new one...');
      
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

      console.log(`[ETH] New market ${newMarketId} started`);

      return NextResponse.json({
        status: 'started',
        marketId: newMarketId.toString(),
        txHash: startHash,
        message: 'New ETH market started after previous resolved'
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
        upPool: formatEther(upPool),
        downPool: formatEther(downPool),
        feesWithdrawn: earlyFeesWithdrawn !== '0' ? earlyFeesWithdrawn : undefined,
        feesTxHash: earlyFeesTxHash,
        message: 'Market has not ended yet' 
      });
    }

    // ============ Market has ended - resolve it ============
    const currentPrice = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getPrice',
    });

    console.log(`[ETH] Resolving market ${id}...`);
    console.log(`[ETH] Start price: ${Number(startPrice) / 1e8}, Current price: ${Number(currentPrice) / 1e8}`);

    // Step 1: Resolve the market
    const resolveHash = await walletClient.writeContract({
      chain: base,
      account,
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'resolveMarket',
    });

    await publicClient.waitForTransactionReceipt({ hash: resolveHash, confirmations: 1 });

    const direction = Number(currentPrice) > Number(startPrice) ? 'UP' : 
                     Number(currentPrice) < Number(startPrice) ? 'DOWN' : 'TIE';

    console.log(`[ETH] Market ${id} resolved: ${direction}`);

    // Step 2: Check and withdraw fees AFTER resolving (fees are now accumulated)
    let feesTxHash = null;
    let feesWithdrawn = '0';
    
    try {
      const accumulatedFees = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getAccumulatedFees',
      });

      console.log(`[ETH] Accumulated fees after resolve: ${formatEther(accumulatedFees)} ETH`);

      if (accumulatedFees > 0n) {
        console.log(`[ETH] Withdrawing ${formatEther(accumulatedFees)} ETH in fees...`);
        
        feesTxHash = await walletClient.writeContract({
          chain: base,
          account,
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'withdrawFees',
        });

        await publicClient.waitForTransactionReceipt({ hash: feesTxHash, confirmations: 1 });
        feesWithdrawn = formatEther(accumulatedFees);
        console.log(`[ETH] Fees withdrawn successfully: ${feesWithdrawn} ETH`);
      } else {
        console.log('[ETH] No fees to withdraw');
      }
    } catch (feeError: any) {
      console.error('[ETH] Fee withdrawal failed:', feeError.message || feeError);
    }

    // Step 3: Start the next market
    console.log('[ETH] Starting next market...');
    
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

    console.log(`[ETH] New market ${newMarketId} started`);

    return NextResponse.json({
      status: 'resolved_and_started',
      resolvedMarketId: id.toString(),
      newMarketId: newMarketId.toString(),
      resolveTxHash: resolveHash,
      startTxHash: startHash,
      feesTxHash,
      feesWithdrawn,
      startPrice: (Number(startPrice) / 1e8).toFixed(2),
      endPrice: (Number(currentPrice) / 1e8).toFixed(2),
      direction,
      upPool: formatEther(upPool),
      downPool: formatEther(downPool),
      message: 'Market resolved and new market started'
    });

  } catch (error: any) {
    console.error('[ETH] Resolver error:', error);
    
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