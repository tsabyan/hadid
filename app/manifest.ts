import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hadid — Workout Tracker',
    short_name: 'Hadid',
    description: 'Your personal strength tracker.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fbfaf9',
    theme_color: '#fbfaf9',
    categories: ['health', 'fitness', 'sports'],
    icons: [
      { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        // Android crops maskable icons to arbitrary shapes. Without a
        // dedicated asset the glyph loses its corners on any device that
        // prefers a circle.
        purpose: 'maskable',
      },
    ],
  }
}
