import React from 'react'
import Link from 'next/link'
import { BarChart3 } from 'lucide-react'

interface LogoProps {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ showText = true, size = 'md' }: LogoProps) {
  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };
  
  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
      <div className="bg-blue-900/70 p-1.5 rounded flex items-center justify-center">
        <BarChart3 className={`${iconSizes[size]} text-blue-400`} />
      </div>
      {showText && (
        <span className={`font-bold text-blue-500 ${textSizes[size]}`}>Giraph</span>
      )}
    </Link>
  )
} 