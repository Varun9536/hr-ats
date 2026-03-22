// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   // In Next.js 16, serverExternalPackages is top-level (moved from experimental)
//   serverExternalPackages: ["pdf-parse", "@prisma/client", "prisma", "bcryptjs"],

//   // Security headers
//   async headers() {
//     return [
//       {
//         source: "/(.*)",
//         headers: [
//           { key: "X-Frame-Options", value: "DENY" },
//           { key: "X-Content-Type-Options", value: "nosniff" },
//           { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
//           { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
//         ],
//       },
//     ]
//   },
// }

// module.exports = nextConfig


/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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
