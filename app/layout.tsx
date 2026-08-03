import type { Metadata, Viewport } from 'next'

import { InstallHint, ServiceWorkerRegistrar } from '@/components/shell/pwa'
import { themeScript } from '@/components/theme'

import './globals.css'

export const metadata: Metadata = {
  title: 'Hadid — Workout Tracker',
  description: 'Your personal strength tracker.',
  appleWebApp: {
    capable: true,
    // 'default' keeps the status bar legible against the warm off-white
    // background. 'black-translucent' would paint content under the clock.
    statusBarStyle: 'default',
    title: 'Hadid',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

/**
 * `viewportFit: 'cover'` is what lets the app paint behind the notch and the
 * home indicator once it is installed to the iOS home screen. Without it the
 * `env(safe-area-inset-*)` values used throughout the layout are all zero.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBFAF9' },
    { media: '(prefers-color-scheme: dark)', color: '#1C1A19' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Runs before first paint so a dark-theme user never sees a white
            flash. suppressHydrationWarning above covers the attribute this
            adds to <html> before React hydrates. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorkerRegistrar />
        <InstallHint />
      </body>
    </html>
  )
}
