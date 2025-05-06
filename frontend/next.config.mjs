/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Add rewrites to proxy API requests to your backend server
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // Update this URL to match your backend server's address
        destination: 'http://localhost:3000/api/:path*', 
      },
    ]
  },
}

export default nextConfig
