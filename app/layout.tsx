import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { FeedbackProvider } from '@/components/ui/Feedback'
import { AmbientBackground } from '@/components/ui/AmbientBackground'
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar'


const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Biblion',
  title: {
    default: 'Biblion — Plataforma de Estudo Bíblico',
    template: '%s | Biblion',
  },
  description: 'Sistema completo para estudo bíblico, criação de sermões, esboços de pregação e preparação de aulas teológicas.',
  keywords: ['bíblia', 'sermões', 'teologia', 'estudo bíblico', 'EBD', 'pregação'],
  authors: [{ name: 'Biblion' }],
  creator: 'Biblion',
  // Personal, password-gated tool — keep it out of search indexes.
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icon-192x192.png', sizes: '192x192' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Biblion',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Biblion',
    title: 'Biblion — Plataforma de Estudo Bíblico',
    description: 'Sistema completo para estudo bíblico, criação de sermões e preparação de aulas teológicas.',
  },
}

export const viewport: Viewport = {
  themeColor: '#08090c',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <AmbientBackground />
        <ServiceWorkerRegistrar />
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  )
}
