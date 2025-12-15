import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ============ Config ============
const CONTRACT_ADDRESS = (process.env.PREDICTION_CONTRACT_ADDRESS || '0x0625E29C2A71A834482bFc6b4cc012ACeee62DA4') as `0x${string}`;
const RESOLVER_PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY as `0x${string}`;
const BASE_RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

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
      { name: 'resolved', type: 'bool' },
      { name: 'winningDirection', type: 'uint8' },
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
    name: 'getCurrentPrice',
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

  // Validate config
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return NextResponse.json({ 
      status: 'error',
      error: 'Contract address not configured' 
    }, { status: 500 });
  }

  if (!RESOLVER_PRIVATE_KEY) {
    return NextResponse.json({ 
      status: 'error',
      error: 'Resolver private key not configured' 
    }, { status: 500 });
  }

  try {
    // Create Base clients
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
    
    if (balanceEth < 0.0001) {
      console.log(`Low resolver balance: ${balanceEth} ETH`);
      return NextResponse.json({ 
        status: 'warning',
        message: 'Resolver wallet balance low',
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

    const [id, startPrice, , , endTime, upPool, downPool, resolved] = market;

    // Check if market exists
    if (id === 0n) {
      return NextResponse.json({ 
        status: 'no_market',
        message: 'No active market found' 
      });
    }

    // Check if already resolved
    if (resolved) {
      return NextResponse.json({ 
        status: 'already_resolved',
        marketId: id.toString(),
        message: 'Market already resolved' 
      });
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    
    // Check if market has ended
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
      functionName: 'getCurrentPrice',
    });

    console.log(`Resolving market ${id}...`);
    console.log(`Start price: ${Number(startPrice) / 1e8}, Current price: ${Number(currentPrice) / 1e8}`);

    // Resolve the market
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'resolveMarket',
    });

    console.log(`Transaction sent: ${hash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash,
      confirmations: 1,
    });

    const direction = Number(currentPrice) > Number(startPrice) ? 'UP' : 
                     Number(currentPrice) < Number(startPrice) ? 'DOWN' : 'TIE';

    console.log(`Market ${id} resolved: ${direction}`);

    return NextResponse.json({
      status: 'resolved',
      marketId: id.toString(),
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      startPrice: (Number(startPrice) / 1e8).toFixed(2),
      endPrice: (Number(currentPrice) / 1e8).toFixed(2),
      direction,
      upPool: formatEther(upPool),
      downPool: formatEther(downPool),
      message: 'Market resolved successfully'
    });

  } catch (error: any) {
    console.error('Resolver error:', error);
    
    // Parse common errors
    let errorMessage = error.message || 'Unknown error';
    if (error.shortMessage) {
      errorMessage = error.shortMessage;
    }
    if (errorMessage.includes('MarketNotEnded')) {
      errorMessage = 'Market has not ended yet';
    }
    if (errorMessage.includes('InvalidOracleData')) {
      errorMessage = 'Chainlink oracle data invalid or stale';
    }
    
    return NextResponse.json({ 
      status: 'error',
      error: errorMessage,
      details: error.details || null
    }, { status: 500 });
  }
}

// Also support POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}