/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Spoonacular and similar recipe sites use various image hosts.
    // We allow any HTTPS source since recipe sources are unpredictable.
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  }
}

module.exports = nextConfig
