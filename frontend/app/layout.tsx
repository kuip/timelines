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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={robotoCondensed.className} suppressHydrationWarning>
      <head>
        <link rel="icon" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon-16x16.png`} sizes="16x16" type="image/png" />
        <link rel="icon" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon-32x32.png`} sizes="32x32" type="image/png" />
        <link rel="icon" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.ico`} sizes="any" />
        <link rel="apple-touch-icon" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/apple-touch-icon.png`} sizes="180x180" type="image/png" />
        <link rel="manifest" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/manifest.json`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Load API config
              (async () => {
                try {
                  const basePath = '${process.env.NEXT_PUBLIC_BASE_PATH || ''}';
                  const response = await fetch(basePath + '/settings.json');
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
