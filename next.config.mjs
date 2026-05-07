/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['sequelize', 'mysql2'],
  experimental: {
    outputFileTracingIncludes: {
      '/**/*': ['./node_modules/mysql2/**/*'],
    },
  },
}

export default nextConfig
