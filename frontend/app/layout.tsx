import type { Metadata } from 'next'
import './globals.css'
import { Roboto_Condensed } from 'next/font/google'
import { ThemeProvider } from '@/lib/ThemeProvider'

const robotoCondensed = Roboto_Condensed({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Timeline - From Big Bang to Now',
  description: 'Explore the complete timeline of the universe from the Big Bang to the present',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={robotoCondensed.className} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Load API config
              (async () => {
                try {
                  const response = await fetch('/settings.json');
                  if (response.ok) {
                    window.__API_CONFIG__ = await response.json();
                  }
                } catch (e) {
                  console.log('Could not load API config');
                }
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
