import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#dc2626',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: 11,
          }}
        >
          <div style={{ width: 28, height: 28, background: '#0a0a0a', borderRadius: '50%' }} />
        </div>
        <div
          style={{
            width: 64,
            height: 64,
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: 11,
          }}
        >
          <div style={{ width: 28, height: 28, background: '#0a0a0a', borderRadius: '50%' }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
