/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ["@workspace/ui", "@workspace/backend"],
}

export default nextConfig
