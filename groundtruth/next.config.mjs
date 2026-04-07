import "./src/env.ts"

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["drizzle-orm", "pg"],
  async headers() {
    return [
      {
        // Required so Reown's connectSocial can poll popup.window.closed
        // for the OAuth popup. same-origin-allow-popups is the value
        // designed for OAuth flows (per MDN).
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ]
  },
}

export default nextConfig
