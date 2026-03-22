// React 19 + Next.js 16 root layout
// React 19: metadata can be rendered directly inside components via <title>, <meta> tags
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "AutoHire ATS", template: "%s | AutoHire" },
  description: "Enterprise Applicant Tracking System",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
