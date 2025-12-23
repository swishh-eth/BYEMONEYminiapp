import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createClient } from '@supabase/supabase-js';

// ============ Config ============
const CLAIM_REWARDS_ADDRESS = (process.env.CLAIM_REWARDS_CONTRACT_ADDRESS || '0x4dD5aBfCec65c9E3C789569aD537E2baC0fBBC21') as `0x${string}`;
const RESOLVER_PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY as `0x${string}`;
const BASE_RPC = process.env.BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/jKHNMnfb18wYA1HfaHxo5';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const CLAIM_REWARDS_ABI = [
  {
    name: 'getCurrentDay',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getDayStartTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'day', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getDayEndTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'day', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'userTicketsEth',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'day', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'userTicketsByemoney',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'day', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'batchRecordTickets',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'users', type: 'address[]' },
      { name: 'tickets', type: 'uint256[]' },
      { name: 'isEth', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'batchRecordTicketsForDay',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'day', type: 'uint256' },
      { name: 'users', type: 'address[]' },
      { name: 'tickets', type: 'uint256[]' },
      { name: 'isEth', type: 'bool' },
    ],
    outputs: [],
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
] as const;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('[SYNC-TICKETS] Unauthorized attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!RESOLVER_PRIVATE_KEY) {
    return NextResponse.json({
      status: 'error',
      error: 'Resolver private key not configured',
    }, { status: 500 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({
      status: 'error',
      error: 'Supabase not configured',
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get current day info from contract
    const todayInfo = await publicClient.readContract({
      address: CLAIM_REWARDS_ADDRESS,
      abi: CLAIM_REWARDS_ABI,
      functionName: 'getTodayInfo',
    }) as [bigint, bigint, bigint, bigint, bigint, bigint];

    const [currentDay, secondsRemaining] = todayInfo;
    
    // Get day start/end times
    const dayStartTime = await publicClient.readContract({
      address: CLAIM_REWARDS_ADDRESS,
      abi: CLAIM_REWARDS_ABI,
      functionName: 'getDayStartTime',
      args: [currentDay],
    }) as bigint;

    const dayEndTime = await publicClient.readContract({
      address: CLAIM_REWARDS_ADDRESS,
      abi: CLAIM_REWARDS_ABI,
      functionName: 'getDayEndTime',
      args: [currentDay],
    }) as bigint;

    const dayStartDate = new Date(Number(dayStartTime) * 1000).toISOString();
    const dayEndDate = new Date(Number(dayEndTime) * 1000).toISOString();

    console.log(`[SYNC-TICKETS] Current day: ${currentDay}, Start: ${dayStartDate}, End: ${dayEndDate}`);

    // Fetch ETH bets for current day
    const { data: ethBets, error: ethError } = await supabase
      .from('prediction_bets')
      .select('wallet_address, tickets')
      .gte('timestamp', dayStartDate)
      .lt('timestamp', dayEndDate);

    if (ethError) {
      console.error('[SYNC-TICKETS] Error fetching ETH bets:', ethError);
    }

    // Fetch BYEMONEY bets for current day
    const { data: byemoneyBets, error: byemoneyError } = await supabase
      .from('byemoney_bets')
      .select('wallet_address, tickets')
      .gte('timestamp', dayStartDate)
      .lt('timestamp', dayEndDate);

    if (byemoneyError) {
      console.error('[SYNC-TICKETS] Error fetching BYEMONEY bets:', byemoneyError);
    }

    // Aggregate ETH tickets by user
    const ethTicketsByUser = new Map<string, bigint>();
    if (ethBets) {
      for (const bet of ethBets) {
        const addr = bet.wallet_address.toLowerCase();
        const current = ethTicketsByUser.get(addr) || 0n;
        ethTicketsByUser.set(addr, current + BigInt(bet.tickets));
      }
    }

    // Aggregate BYEMONEY tickets by user
    const byemoneyTicketsByUser = new Map<string, bigint>();
    if (byemoneyBets) {
      for (const bet of byemoneyBets) {
        const addr = bet.wallet_address.toLowerCase();
        const current = byemoneyTicketsByUser.get(addr) || 0n;
        byemoneyTicketsByUser.set(addr, current + BigInt(bet.tickets));
      }
    }

    // Check which users need to be synced (compare with on-chain)
    const ethUsersToSync: string[] = [];
    const ethTicketsToSync: bigint[] = [];

    for (const [user, tickets] of ethTicketsByUser) {
      try {
        const onChainTickets = await publicClient.readContract({
          address: CLAIM_REWARDS_ADDRESS,
          abi: CLAIM_REWARDS_ABI,
          functionName: 'userTicketsEth',
          args: [currentDay, user as `0x${string}`],
        }) as bigint;

        const diff = tickets - onChainTickets;
        if (diff > 0n) {
          ethUsersToSync.push(user);
          ethTicketsToSync.push(diff);
        }
      } catch (e) {
        // User not recorded yet, add full amount
        ethUsersToSync.push(user);
        ethTicketsToSync.push(tickets);
      }
    }

    const byemoneyUsersToSync: string[] = [];
    const byemoneyTicketsToSync: bigint[] = [];

    for (const [user, tickets] of byemoneyTicketsByUser) {
      try {
        const onChainTickets = await publicClient.readContract({
          address: CLAIM_REWARDS_ADDRESS,
          abi: CLAIM_REWARDS_ABI,
          functionName: 'userTicketsByemoney',
          args: [currentDay, user as `0x${string}`],
        }) as bigint;

        const diff = tickets - onChainTickets;
        if (diff > 0n) {
          byemoneyUsersToSync.push(user);
          byemoneyTicketsToSync.push(diff);
        }
      } catch (e) {
        byemoneyUsersToSync.push(user);
        byemoneyTicketsToSync.push(tickets);
      }
    }

    let ethTxHash = null;
    let byemoneyTxHash = null;
    let ethUsersSynced = 0;
    let byemoneyUsersSynced = 0;

    // Sync ETH tickets (batch up to 50 at a time)
    if (ethUsersToSync.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < ethUsersToSync.length; i += batchSize) {
        const usersBatch = ethUsersToSync.slice(i, i + batchSize) as `0x${string}`[];
        const ticketsBatch = ethTicketsToSync.slice(i, i + batchSize);

        console.log(`[SYNC-TICKETS] Syncing ${usersBatch.length} ETH users...`);

        ethTxHash = await walletClient.writeContract({
          chain: base,
          account,
          address: CLAIM_REWARDS_ADDRESS,
          abi: CLAIM_REWARDS_ABI,
          functionName: 'batchRecordTickets',
          args: [usersBatch, ticketsBatch, true],
        });

        await publicClient.waitForTransactionReceipt({ hash: ethTxHash, confirmations: 1 });
        ethUsersSynced += usersBatch.length;
      }
    }

    // Sync BYEMONEY tickets
    if (byemoneyUsersToSync.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < byemoneyUsersToSync.length; i += batchSize) {
        const usersBatch = byemoneyUsersToSync.slice(i, i + batchSize) as `0x${string}`[];
        const ticketsBatch = byemoneyTicketsToSync.slice(i, i + batchSize);

        console.log(`[SYNC-TICKETS] Syncing ${usersBatch.length} BYEMONEY users...`);

        byemoneyTxHash = await walletClient.writeContract({
          chain: base,
          account,
          address: CLAIM_REWARDS_ADDRESS,
          abi: CLAIM_REWARDS_ABI,
          functionName: 'batchRecordTickets',
          args: [usersBatch, ticketsBatch, false],
        });

        await publicClient.waitForTransactionReceipt({ hash: byemoneyTxHash, confirmations: 1 });
        byemoneyUsersSynced += usersBatch.length;
      }
    }

    return NextResponse.json({
      status: 'success',
      currentDay: currentDay.toString(),
      secondsRemaining: Number(secondsRemaining),
      ethUsersSynced,
      byemoneyUsersSynced,
      ethTxHash,
      byemoneyTxHash,
      message: ethUsersSynced + byemoneyUsersSynced > 0 
        ? `Synced ${ethUsersSynced} ETH users and ${byemoneyUsersSynced} BYEMONEY users`
        : 'No new tickets to sync',
    });

  } catch (error: any) {
    console.error('[SYNC-TICKETS] Error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error.message || 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}