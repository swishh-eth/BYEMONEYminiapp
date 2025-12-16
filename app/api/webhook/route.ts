import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log webhook events for debugging
    console.log('Farcaster webhook received:', JSON.stringify(body, null, 2));
    
    // Handle different event types
    const { event } = body;
    
    switch (event) {
      case 'frame_added':
        // User added the miniapp
        console.log('User added miniapp');
        break;
      case 'frame_removed':
        // User removed the miniapp
        console.log('User removed miniapp');
        break;
      case 'notifications_enabled':
        // User enabled notifications
        console.log('Notifications enabled');
        break;
      case 'notifications_disabled':
        // User disabled notifications
        console.log('Notifications disabled');
        break;
      default:
        console.log('Unknown event:', event);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' });
}