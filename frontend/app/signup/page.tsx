import type { Metadata } from "next"
import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"
import { AuthLayout } from "@/components/auth/auth-layout"

export const metadata: Metadata = {
  title: "Sign Up | Giraph",
  description: "Create your Giraph account",
}

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your Giraph account"
      subtitle="Start generating powerful dashboards from your data."
      image="/placeholder.svg?height=600&width=600"
    >
      <SignupForm />
      <div className="mt-6 text-center text-sm">
        <p className="text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-teal-600 hover:text-teal-500">
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
