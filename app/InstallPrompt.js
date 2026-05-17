'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'install_dismissed_at';
const NAG_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    if (dismissedAt && Date.now() - dismissedAt < NAG_INTERVAL_MS) return;

    const handler = (e) => {
      e.preventDefault();
      setInstallEvent(e);
      setHidden(false);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const ua = window.navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) {
      setShowIos(true);
      setHidden(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (hidden) return null;

  async function install() {
    if (!installEvent) return;
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setInstallEvent(null);
      setHidden(true);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setHidden(true);
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 92,
        left: 12,
        right: 12,
        background: 'rgba(28, 28, 30, 0.92)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderRadius: 14,
        padding: '14px 16px',
        color: '#f5f5f7',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        maxWidth: 616,
        margin: '0 auto',
        letterSpacing: '-0.01em',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>Install Occhio</div>
        {installEvent ? (
          <div style={{ fontSize: 12, color: 'rgba(235, 235, 245, 0.6)' }}>One tap to add it to your home screen.</div>
        ) : (
          <div style={{ fontSize: 12, color: 'rgba(235, 235, 245, 0.6)' }}>
            Tap <span style={{ fontWeight: 600, color: '#f5f5f7' }}>Share</span> → <span style={{ fontWeight: 600, color: '#f5f5f7' }}>Add to Home Screen</span>
          </div>
        )}
      </div>
      {installEvent && (
        <button
          onClick={install}
          style={{
            padding: '8px 16px',
            background: '#0a84ff',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Install
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Close"
        style={{
          background: 'transparent',
          color: 'rgba(235, 235, 245, 0.5)',
          border: 'none',
          fontSize: 22,
          lineHeight: 1,
          cursor: 'pointer',
          padding: '0 4px',
        }}
      >
        ×
      </button>
    </div>
  );
}
