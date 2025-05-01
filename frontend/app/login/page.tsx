import type { Metadata } from "next"
import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"
import { AuthLayout } from "@/components/auth/auth-layout"

export const metadata: Metadata = {
  title: "Login | Giraph",
  description: "Login to your Giraph account",
}

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back to Giraph"
      subtitle="Please login to continue exploring your data insights."
      image="/placeholder.svg?height=600&width=600"
    >
      <LoginForm />
      <div className="mt-6 text-center text-sm">
        <p className="text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-teal-600 hover:text-teal-500">
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
