export const metadata = {
  title: 'Occhio',
  description: 'Community alerts: inspectors on Lombardy trains',
  appleWebApp: {
    capable: true,
    title: 'Occhio',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport = {
  themeColor: '#dc2626',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="google" content="notranslate" />
      </head>
      <body style={{
        margin: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: '#0a0a0a',
        color: '#f5f5f5',
        minHeight: '100vh',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 110px' }}>
          {children}
        </div>
        <footer style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '14px 16px',
          background: '#1a1a1a',
          borderTop: '2px solid #3b82f6',
          fontSize: 14,
          color: '#e5e5e5',
          textAlign: 'center',
          lineHeight: 1.5,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.5)',
        }}>
          <div style={{ marginBottom: 4 }}>
            ⚠️ <strong>Always buy a valid ticket.</strong>
          </div>
          <div style={{ fontSize: 12, color: '#aaa' }}>
            Community reports · Not affiliated with Trenord ·{' '}
            <a href="/privacy" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>Privacy</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
