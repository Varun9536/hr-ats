/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // 🔥 ADD THIS
  typescript: {
    ignoreBuildErrors: true,
  },

  serverExternalPackages: ["pdf-parse", "@prisma/client", "prisma", "bcryptjs"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
}

module.exports = nextConfig