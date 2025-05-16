'use client'; // Make it a client component

import type { Metadata } from "next"
import Link from "next/link"
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
import { LoginForm } from "@/components/auth/login-form"
import { AuthLayout } from "@/components/auth/auth-layout"

// Metadata might need to be handled differently for client components or removed if not critical here
// export const metadata: Metadata = {
//   title: "Login | Giraph",
//   description: "Login to your Giraph account",
// }

export default function LoginPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const verified = searchParams.get('verified')
    const error = searchParams.get('error')
    const message = searchParams.get('message')

    if (message === 'verify-email') {
      toast({
        title: "Signup Successful!",
        description: "Please check your email to verify your account before logging in.",
        duration: 10000, // Keep it longer
      })
    }
    if (verified === 'true') {
      toast({
        title: "Email Verified!",
        description: "Your email has been successfully verified. Please log in.",
        variant: "default",
      })
    } else if (verified === 'false') {
      let description = "Email verification failed. Please try again or contact support."
      if (error === 'invalid_token') {
        description = "The verification link is invalid or has expired. Please try signing up again or request a new link."
      }
      toast({
        title: "Verification Failed",
        description: description,
        variant: "destructive",
      })
    }
    // Optional: Clean up URL by removing query params after showing toast
    // window.history.replaceState(null, '', '/login')
  }, [searchParams])

  return (
    <AuthLayout
      title="Welcome back to Giraph"
      subtitle="Please login to continue exploring your data insights."
      image="/placeholder.svg?height=600&width=600"
    >
      <LoginForm />
      <div className="mt-6 text-center text-sm">
        <p className="text-gray-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-blue-400 hover:text-blue-300">
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
