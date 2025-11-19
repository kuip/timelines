/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',  // Enable static export for GitHub Pages
  images: {
    unoptimized: true,  // Required for static export
  },
  // Base path for GitHub Pages deployment
  // For user/org sites (username.github.io), leave empty
  // For project sites (username.github.io/repo-name), use '/repo-name'
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  },
}

module.exports = nextConfig
