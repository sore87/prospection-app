/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { 
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
    serverActionsBodySizeLimit: '10mb',
  },
}

module.exports = nextConfig