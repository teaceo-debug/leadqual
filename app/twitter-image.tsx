import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'LeadScores - AI-Powered B2B Lead Qualification'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
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
          backgroundColor: '#0a0a0a',
          backgroundImage: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
        }}
      >
        {/* Background decoration */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(37, 99, 235, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 16,
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 20,
            }}
          >
            <span style={{ color: 'white', fontSize: 36, fontWeight: 'bold' }}>LS</span>
          </div>
          <span style={{ color: 'white', fontSize: 48, fontWeight: 'bold' }}>LeadScores</span>
        </div>

        {/* Main heading */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '0 60px',
          }}
        >
          <h1
            style={{
              fontSize: 64,
              fontWeight: 'bold',
              color: 'white',
              margin: 0,
              marginBottom: 20,
              lineHeight: 1.1,
            }}
          >
            AI-Powered B2B Lead
          </h1>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
              backgroundClip: 'text',
              color: 'transparent',
              margin: 0,
              marginBottom: 30,
            }}
          >
            Qualification
          </h1>
          <p
            style={{
              fontSize: 28,
              color: '#a1a1aa',
              margin: 0,
              maxWidth: 800,
            }}
          >
            Score and prioritize your inbound leads instantly using your Ideal Customer Profile
          </p>
        </div>

        {/* Score badges */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            marginTop: 50,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              border: '2px solid rgba(34, 197, 94, 0.5)',
              borderRadius: 50,
              padding: '12px 24px',
            }}
          >
            <span style={{ color: '#22c55e', fontSize: 24, fontWeight: 'bold', marginRight: 10 }}>85</span>
            <span style={{ color: '#22c55e', fontSize: 20 }}>HOT</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(234, 179, 8, 0.2)',
              border: '2px solid rgba(234, 179, 8, 0.5)',
              borderRadius: 50,
              padding: '12px 24px',
            }}
          >
            <span style={{ color: '#eab308', fontSize: 24, fontWeight: 'bold', marginRight: 10 }}>62</span>
            <span style={{ color: '#eab308', fontSize: 20 }}>WARM</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(156, 163, 175, 0.2)',
              border: '2px solid rgba(156, 163, 175, 0.5)',
              borderRadius: 50,
              padding: '12px 24px',
            }}
          >
            <span style={{ color: '#9ca3af', fontSize: 24, fontWeight: 'bold', marginRight: 10 }}>28</span>
            <span style={{ color: '#9ca3af', fontSize: 20 }}>COLD</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
