import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext' // Import AuthProvider
import { Toaster } from "@/components/ui/toaster" // Import Toaster

export const metadata: Metadata = {
  title: 'Giraph', // Updated title
  description: 'AI-Powered Data Analysis Platform', // Updated description
  generator: 'Muhammad Waleed , Ahsan Riaz & Abdullah Saleh',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider> {/* Wrap children with AuthProvider */}
          {children}
          <Toaster /> {/* Add Toaster component */}
        </AuthProvider>
      </body>
    </html>
  )
}
