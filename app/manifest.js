export default function manifest() {
  return {
    name: 'Occhio',
    short_name: 'Occhio',
    description: 'Community alerts: inspectors on Lombardy trains',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#dc2626',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
