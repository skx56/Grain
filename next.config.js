/** @type {import('next').NextConfig} */
const basePath = process.env.GITHUB_PAGES === 'true' ? '/Grain' : ''

const nextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
