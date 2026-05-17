import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
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
          gap: 50,
        }}
      >
        <div
          style={{
            width: 180,
            height: 180,
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: 30,
          }}
        >
          <div style={{ width: 80, height: 80, background: '#0a0a0a', borderRadius: '50%' }} />
        </div>
        <div
          style={{
            width: 180,
            height: 180,
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: 30,
          }}
        >
          <div style={{ width: 80, height: 80, background: '#0a0a0a', borderRadius: '50%' }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
