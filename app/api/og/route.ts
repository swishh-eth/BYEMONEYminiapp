import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #000000 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              color: '#ef4444',
              marginBottom: 10,
            }}
          >
            $BYEMONEY
          </div>
          <div
            style={{
              fontSize: 32,
              color: '#ffffff',
              opacity: 0.8,
            }}
          >
            ETH Prediction Game
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 30,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '30px 50px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 20,
              border: '2px solid rgba(255,255,255,0.2)',
            }}
          >
            <div style={{ fontSize: 48, color: '#ffffff', marginBottom: 10 }}>↑</div>
            <div style={{ fontSize: 28, color: '#ffffff', fontWeight: 'bold' }}>PUMP</div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '30px 50px',
              backgroundColor: 'rgba(239,68,68,0.2)',
              borderRadius: 20,
              border: '2px solid rgba(239,68,68,0.4)',
            }}
          >
            <div style={{ fontSize: 48, color: '#ef4444', marginBottom: 10 }}>↓</div>
            <div style={{ fontSize: 28, color: '#ef4444', fontWeight: 'bold' }}>DUMP</div>
          </div>
        </div>

        <div
          style={{
            fontSize: 24,
            color: '#ffffff',
            opacity: 0.6,
          }}
        >
          Predict ETH price • Win rewards
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}