import InstallPrompt from './InstallPrompt';

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
  themeColor: '#000000',
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
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif',
        background: '#000',
        color: '#f5f5f7',
        minHeight: '100vh',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        letterSpacing: '-0.01em',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 18px 120px' }}>
          {children}
        </div>
        <InstallPrompt />
        <footer style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '14px 18px calc(14px + env(safe-area-inset-bottom))',
          background: 'rgba(28, 28, 30, 0.85)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderTop: '0.5px solid rgba(255, 255, 255, 0.08)',
          fontSize: 13,
          color: '#f5f5f7',
          textAlign: 'center',
          lineHeight: 1.4,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 3, letterSpacing: '-0.01em' }}>
            Always buy a valid ticket.
          </div>
          <div style={{ fontSize: 11, color: 'rgba(235, 235, 245, 0.6)' }}>
            Community reports · Not affiliated with Trenord ·{' '}
            <a href="/privacy" style={{ color: '#0a84ff', textDecoration: 'none' }}>Privacy</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
