import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
