import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ============ Config ============
const CLAIM_REWARDS_ADDRESS = (process.env.CLAIM_REWARDS_CONTRACT_ADDRESS || '0x4dD5aBfCec65c9E3C789569aD537E2baC0fBBC21') as `0x${string}`;
const RESOLVER_PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY as `0x${string}`;
const BASE_RPC = process.env.BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/jKHNMnfb18wYA1HfaHxo5';

const CLAIM_REWARDS_ABI = [
  {
    name: 'getCurrentDay',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'snapshotYesterday',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'snapshotDay',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'day', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'daySnapshotted',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'day', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getDayInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'day', type: 'uint256' }],
    outputs: [
      { name: 'ethPool', type: 'uint256' },
      { name: 'byemoneyPool', type: 'uint256' },
      { name: 'totalTicketsEth', type: 'uint256' },
      { name: 'totalTicketsByemoney', type: 'uint256' },
      { name: 'snapshotted', type: 'bool' },
    ],
  },
  {
    name: 'getTodayInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'day', type: 'uint256' },
      { name: 'secondsRemaining', type: 'uint256' },
      { name: 'currentEthBalance', type: 'uint256' },
      { name: 'currentByemoneyBalance', type: 'uint256' },
      { name: 'totalTicketsEthToday', type: 'uint256' },
      { name: 'totalTicketsByemoneyToday', type: 'uint256' },
    ],
  },
  {
    name: 'lastSnapshottedDay',
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
    console.log('[SNAPSHOT-DAY] Unauthorized attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!RESOLVER_PRIVATE_KEY) {
    return NextResponse.json({
      status: 'error',
      error: 'Resolver private key not configured',
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

    // Get current day
    const currentDay = await publicClient.readContract({
      address: CLAIM_REWARDS_ADDRESS,
      abi: CLAIM_REWARDS_ABI,
      functionName: 'getCurrentDay',
    });

    const yesterday = currentDay - 1n;

    // Check if yesterday is already snapshotted
    const isSnapshotted = await publicClient.readContract({
      address: CLAIM_REWARDS_ADDRESS,
      abi: CLAIM_REWARDS_ABI,
      functionName: 'daySnapshotted',
      args: [yesterday],
    });

    if (isSnapshotted) {
      // Get yesterday's info
      const dayInfo = await publicClient.readContract({
        address: CLAIM_REWARDS_ADDRESS,
        abi: CLAIM_REWARDS_ABI,
        functionName: 'getDayInfo',
        args: [yesterday],
      });

      return NextResponse.json({
        status: 'already_snapshotted',
        currentDay: currentDay.toString(),
        yesterday: yesterday.toString(),
        ethPool: formatEther(dayInfo[0]),
        byemoneyPool: formatEther(dayInfo[1]),
        totalTicketsEth: dayInfo[2].toString(),
        totalTicketsByemoney: dayInfo[3].toString(),
        message: 'Yesterday already snapshotted',
      });
    }

    // Get today's balance info before snapshot
    const todayInfo = await publicClient.readContract({
      address: CLAIM_REWARDS_ADDRESS,
      abi: CLAIM_REWARDS_ABI,
      functionName: 'getTodayInfo',
    });

    console.log(`[SNAPSHOT-DAY] Snapshotting day ${yesterday}...`);
    console.log(`[SNAPSHOT-DAY] Current ETH balance: ${formatEther(todayInfo[2])}`);
    console.log(`[SNAPSHOT-DAY] Current BYEMONEY balance: ${formatEther(todayInfo[3])}`);

    // Snapshot yesterday
    const txHash = await walletClient.writeContract({
      chain: base,
      account,
      address: CLAIM_REWARDS_ADDRESS,
      abi: CLAIM_REWARDS_ABI,
      functionName: 'snapshotYesterday',
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });

    // Get the snapshotted info
    const dayInfo = await publicClient.readContract({
      address: CLAIM_REWARDS_ADDRESS,
      abi: CLAIM_REWARDS_ABI,
      functionName: 'getDayInfo',
      args: [yesterday],
    });

    console.log(`[SNAPSHOT-DAY] Day ${yesterday} snapshotted successfully`);

    return NextResponse.json({
      status: 'success',
      currentDay: currentDay.toString(),
      snapshottedDay: yesterday.toString(),
      ethPool: formatEther(dayInfo[0]),
      byemoneyPool: formatEther(dayInfo[1]),
      totalTicketsEth: dayInfo[2].toString(),
      totalTicketsByemoney: dayInfo[3].toString(),
      txHash,
      message: `Day ${yesterday} snapshotted - users can now claim rewards`,
    });

  } catch (error: any) {
    console.error('[SNAPSHOT-DAY] Error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error.message || 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}