/** @type {import('next').NextConfig} */
const config = {
  images: {
    remotePatterns: [
      // Example for localhost (if needed, using http)
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      // Example for your ngrok domain (remove trailing slash)
      {
        protocol: 'https',
        hostname: 'thenewjeweller.plutuserver.in',
      },
      // Example for your BASE_URL (dynamically configured)
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_BASE_URL?.replace(/https?:\/\//, ''),
      },
      // Or if you want to allow all https images (use with caution)
      // {
      //   protocol: 'https',
      //   hostname: '**',
      // },
    ],
    dangerouslyAllowSVG: true,
    domains: [
      'localhost',
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/https?:\/\//, '')?.split(':')[0] || 'localhost'
    ]
  },
  // Allow this Next.js application to serve the API routes in production
  output: 'standalone',
};

export default config;