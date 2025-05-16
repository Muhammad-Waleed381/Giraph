import type { Metadata } from 'next'
import './globals.css'
import '../styles/chart-styles.css'
import { AuthProvider } from '@/context/AuthContext' // Import AuthProvider
import { Toaster } from "@/components/ui/toaster" // Import Toaster
import { ThemeProvider } from "@/components/theme-provider" // Import ThemeProvider for dark/light mode

export const metadata: Metadata = {
  title: 'Giraph - AI-Powered Data Analytics',
  description: 'Transform your raw data into beautiful dashboards and actionable insights instantly with AI',
  generator: 'Next.js',
  icons: {
    icon: '/favicon.ico',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider> {/* Wrap children with AuthProvider */}
            {children}
            <Toaster /> {/* Add Toaster component */}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
