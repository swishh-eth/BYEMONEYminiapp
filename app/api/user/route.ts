import { NextRequest, NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');

  if (!fid) {
    return NextResponse.json({ error: 'fid required' }, { status: 400 });
  }

  if (!NEYNAR_API_KEY) {
    return NextResponse.json({ 
      fid: parseInt(fid),
      username: 'anon',
      pfp_url: '',
    });
  }

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY,
        },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error('Neynar API error');
    }

    const data = await response.json();
    const user = data.users?.[0];

    if (!user) {
      return NextResponse.json({ 
        fid: parseInt(fid),
        username: 'anon',
        pfp_url: '',
      });
    }

    return NextResponse.json({
      fid: user.fid,
      username: user.username,
      pfp_url: user.pfp_url || '',
      display_name: user.display_name || user.username,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ 
      fid: parseInt(fid),
      username: 'anon',
      pfp_url: '',
    });
  }
}