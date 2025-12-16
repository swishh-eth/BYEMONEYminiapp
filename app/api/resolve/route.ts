import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, formatEther, parseEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ============ Config ============
const CONTRACT_ADDRESS = (process.env.PREDICTION_CONTRACT_ADDRESS || '0x0625E29C2A71A834482bFc6b4cc012ACeee62DA4') as `0x${string}`;
const RESOLVER_PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY as `0x${string}`;
const BASE_RPC = process.env.BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/jKHNMnfb18wYA1HfaHxo5';
const SEED_AMOUNT = process.env.SEED_AMOUNT || '0.001'; // ETH to seed new markets

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
    name: 'seedMarket',
    type: 'function',
    stateMutability: 'payable',
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
] as const;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Unauthorized resolver attempt');
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

    // Check resolver wallet balance
    const balance = await publicClient.getBalance({ address: account.address });
    const balanceEth = Number(formatEther(balance));
    
    if (balanceEth < 0.001) {
      console.log(`Low resolver balance: ${balanceEth} ETH`);
      return NextResponse.json({ 
        status: 'warning',
        message: 'Resolver wallet balance low - need ETH for gas + seeding',
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

    // If no market or already resolved, seed a new one
    if (id === 0n || isResolved) {
      console.log('No active market, seeding new one...');
      
      const seedAmount = parseEther(SEED_AMOUNT);
      
      const seedHash = await walletClient.writeContract({
        chain: base,
        account,
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'seedMarket',
        value: seedAmount,
      });

      await publicClient.waitForTransactionReceipt({ hash: seedHash, confirmations: 1 });

      // Get new market ID
      const newMarketId = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'currentMarketId',
      });

      console.log(`New market ${newMarketId} seeded with ${SEED_AMOUNT} ETH`);

      return NextResponse.json({
        status: 'seeded',
        marketId: newMarketId.toString(),
        txHash: seedHash,
        seedAmount: SEED_AMOUNT,
        message: 'New market seeded successfully'
      });
    }

    // Check if market has ended
    const now = BigInt(Math.floor(Date.now() / 1000));
    
    if (now < endTime) {
      const timeRemaining = Number(endTime - now);
      const hours = Math.floor(timeRemaining / 3600);
      const minutes = Math.floor((timeRemaining % 3600) / 60);
      
      return NextResponse.json({ 
        status: 'pending',
        marketId: id.toString(),
        endTime: new Date(Number(endTime) * 1000).toISOString(),
        timeRemaining: `${hours}h ${minutes}m`,
        upPool: formatEther(upPool),
        downPool: formatEther(downPool),
        message: 'Market has not ended yet' 
      });
    }

    // Get current price for logging
    const currentPrice = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getPrice',
    });

    console.log(`Resolving market ${id}...`);
    console.log(`Start price: ${Number(startPrice) / 1e8}, Current price: ${Number(currentPrice) / 1e8}`);

    // Resolve the market
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

    console.log(`Market ${id} resolved: ${direction}`);

    // Auto-seed the next market
    console.log('Auto-seeding next market...');
    
    const seedAmount = parseEther(SEED_AMOUNT);
    
    const seedHash = await walletClient.writeContract({
      chain: base,
      account,
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'seedMarket',
      value: seedAmount,
    });

    await publicClient.waitForTransactionReceipt({ hash: seedHash, confirmations: 1 });

    const newMarketId = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'currentMarketId',
    });

    console.log(`New market ${newMarketId} seeded`);

    return NextResponse.json({
      status: 'resolved_and_seeded',
      resolvedMarketId: id.toString(),
      newMarketId: newMarketId.toString(),
      resolveTxHash: resolveHash,
      seedTxHash: seedHash,
      startPrice: (Number(startPrice) / 1e8).toFixed(2),
      endPrice: (Number(currentPrice) / 1e8).toFixed(2),
      direction,
      upPool: formatEther(upPool),
      downPool: formatEther(downPool),
      seedAmount: SEED_AMOUNT,
      message: 'Market resolved and new market seeded'
    });

  } catch (error: any) {
    console.error('Resolver error:', error);
    
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