import "./src/env.ts"

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["drizzle-orm", "pg"],
}

export default nextConfig
