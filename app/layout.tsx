import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadscores.com'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'LeadScores - AI-Powered B2B Lead Qualification',
    template: '%s | LeadScores',
  },
  description: 'Automatically qualify and score B2B leads using AI. Define your Ideal Customer Profile, capture leads, and prioritize your sales pipeline with intelligent lead scoring.',
  keywords: [
    'lead qualification',
    'lead scoring',
    'B2B leads',
    'AI lead qualification',
    'sales automation',
    'ideal customer profile',
    'ICP',
    'lead management',
    'sales pipeline',
    'inbound leads',
    'lead prioritization',
  ],
  authors: [{ name: 'LeadScores' }],
  creator: 'LeadScores',
  publisher: 'LeadScores',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'LeadScores',
    title: 'LeadScores - AI-Powered B2B Lead Qualification',
    description: 'Automatically qualify and score B2B leads using AI. Define your Ideal Customer Profile and prioritize your sales pipeline.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LeadScores - AI-Powered B2B Lead Qualification',
    description: 'Automatically qualify and score B2B leads using AI. Define your Ideal Customer Profile and prioritize your sales pipeline.',
    creator: '@leadscores',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: siteUrl,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
