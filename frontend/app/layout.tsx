import type { Metadata } from 'next'
import './globals.css'
import { Roboto_Condensed } from 'next/font/google'

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
    <html lang="en" className={robotoCondensed.className}>
      <body>{children}</body>
    </html>
  )
}
