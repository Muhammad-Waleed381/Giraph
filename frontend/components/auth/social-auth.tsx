"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext";

interface SocialAuthProps {
  isLoading?: boolean;
  isSignUp?: boolean;
}

export function SocialAuth({ isLoading: propIsLoading, isSignUp = false }: SocialAuthProps) {
  const { loginWithGoogle, isLoading: authIsLoading } = useAuth();

  const G_isLoading = propIsLoading !== undefined ? propIsLoading : authIsLoading;

  const handleGoogleAuth = () => {
    loginWithGoogle();
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-gray-800 px-2 text-gray-400">Or {isSignUp ? "sign up" : "log in"} with</span>
        </div>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" disabled={G_isLoading} className="w-full max-w-xs border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white" onClick={handleGoogleAuth}>
          <svg
            className="mr-2 h-4 w-4"
            aria-hidden="true"
            focusable="false"
            data-prefix="fab"
            data-icon="google"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 488 512"
          >
            <path
              fill="currentColor"
              d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
            ></path>
          </svg>
          Google
        </Button>
      </div>
    </div>
  )
}
