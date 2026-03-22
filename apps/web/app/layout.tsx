import { ClerkProvider } from "@clerk/nextjs"
import { Geist, Geist_Mono } from "next/font/google"
import Script from "next/script"

import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"
import { Toaster} from "@workspace/ui/components/sonner";


const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

/** Optional: self-track this Next app (same host serves /monotron-analytics.js). */
const websiteAnalyticsIngestKey =
  process.env.NEXT_PUBLIC_WEBSITE_ANALYTICS_INGEST_KEY
const websiteAnalyticsEndpoint =
  process.env.NEXT_PUBLIC_WEBSITE_ANALYTICS_ENDPOINT

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <ClerkProvider
        appearance={{
          variables: {
            colorPrimary: "#3C82F6"
          }
        }}>
        <Providers>
          <Toaster/>
          
          {children}
        
          </Providers>
        </ClerkProvider>
        {websiteAnalyticsIngestKey && websiteAnalyticsEndpoint ? (
          <Script
            src="/monotron-analytics.js"
            strategy="afterInteractive"
            data-ingest-key={websiteAnalyticsIngestKey}
            data-endpoint={websiteAnalyticsEndpoint}
          />
        ) : null}
      </body>
    </html>
  )
}
