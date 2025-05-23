"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/context/AuthContext" // Import useAuth
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Check, X } from "lucide-react"
import { SocialAuth } from "@/components/auth/social-auth"

export function SignupForm() {
  const { signup, isLoading: authIsLoading } = useAuth() // Get signup and isLoading from context
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    general: "",
  })

  const passwordRequirements = [
    { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
    { id: "uppercase", label: "At least 1 uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
    { id: "number", label: "At least 1 number", test: (p: string) => /[0-9]/.test(p) },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
    // Clear general error on any change
    if (errors.general) {
        setErrors((prev) => ({ ...prev, general: "" }))
    }
  }

  const togglePasswordVisibility = (field: "password" | "confirmPassword") => {
    if (field === "password") {
      setShowPassword(!showPassword)
    } else {
      setShowConfirmPassword(!showConfirmPassword)
    }
  }

  const validateForm = () => {
    let valid = true
    const newErrors = { first_name: "", last_name: "", email: "", password: "", confirmPassword: "", general: "" } // Reset errors

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required"
      valid = false
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required"
      valid = false
    }

    if (!formData.email) {
      newErrors.email = "Email is required"
      valid = false
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid"
      valid = false
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
      valid = false
    } else {
      const failedRequirements = passwordRequirements.filter((req) => !req.test(formData.password))
      if (failedRequirements.length > 0) {
        newErrors.password = "Password doesn't meet requirements"
        valid = false
      }
    }

    if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
        valid = false;
    } else if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match"
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setErrors((prev) => ({ ...prev, general: "" })) // Clear previous general errors

    try {
      // Use the signup function from AuthContext
      await signup({ 
        first_name: formData.first_name, 
        last_name: formData.last_name, 
        email: formData.email, 
        password: formData.password 
      })
      // Success toast and redirection are handled within AuthContext
    } catch (error: any) {
      // Display specific error message from context/API
      setErrors((prev) => ({ ...prev, general: error.message || "Signup failed. Please try again." }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Display general errors */}
      {errors.general && <div className="rounded-md bg-red-50 p-3 text-sm text-red-500">{errors.general}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Input */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              name="first_name"
              type="text"
              placeholder="John"
              autoComplete="given-name"
              value={formData.first_name}
              onChange={handleChange}
              disabled={authIsLoading}
              className={errors.first_name ? "border-red-500" : ""}
            />
            {errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              name="last_name"
              type="text"
              placeholder="Doe"
              autoComplete="family-name"
              value={formData.last_name}
              onChange={handleChange}
              disabled={authIsLoading}
              className={errors.last_name ? "border-red-500" : ""}
            />
            {errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
          </div>
        </div>

        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            disabled={authIsLoading}
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              disabled={authIsLoading}
              className={errors.password ? "border-red-500 pr-10" : "pr-10"}
            />
            {/* ... eye icon button */}
             <button
              type="button"
              onClick={() => togglePasswordVisibility("password")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
          {/* Password requirements */}
          <div className="mt-2 space-y-2">
            {passwordRequirements.map((req) => (
              <div key={req.id} className="flex items-center space-x-2">
                {/* ... check/x icons */}
                 {formData.password && req.test(formData.password) ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-gray-300" />
                )}
                <span
                  className={`text-xs ${formData.password && req.test(formData.password) ? "text-green-500" : "text-gray-500"}`}
                >
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Confirm Password Input */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={authIsLoading}
              className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
            />
            {/* ... eye icon button */}
            <button
              type="button"
              onClick={() => togglePasswordVisibility("confirmPassword")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
        </div>

        {/* Terms and Policy */}
        <div className="text-xs text-gray-400">
          By signing up, you agree to our{" "}
          <a href="#" className="text-blue-400 hover:text-blue-300">
            Terms
          </a>{" "}
          and{" "}
          <a href="#" className="text-blue-400 hover:text-blue-300">
            Privacy Policy
          </a>
          .
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={authIsLoading}>
          {authIsLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      {/* Social Auth */}
      <SocialAuth isLoading={authIsLoading} isSignUp />
    </div>
  )
}
