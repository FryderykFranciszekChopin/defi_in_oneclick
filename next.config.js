/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Image optimization
  images: {
    domains: ['static.okx.com', 'cdn.jsdelivr.net'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Performance optimizations
  swcMinify: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'production'
              ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://www.okx.com https://testrpc.xlayer.tech https://rpc.xlayer.tech wss://rpc.xlayer.tech https://eth-sepolia.public.blastapi.io https://sepolia.drpc.org https://api.pimlico.io; frame-src 'none'; object-src 'none';"
              : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:* https://www.okx.com https://testrpc.xlayer.tech https://rpc.xlayer.tech wss://rpc.xlayer.tech https://eth-sepolia.public.blastapi.io https://sepolia.drpc.org https://api.pimlico.io; frame-src 'none'; object-src 'none';"
          }
        ]
      }
    ]
  },
  
  // Environment variables validation
  env: {
    NEXT_PUBLIC_XLAYER_CHAIN_ID: process.env.NEXT_PUBLIC_XLAYER_CHAIN_ID || '196',
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Browser polyfills for crypto and node modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        os: false,
        path: false,
        fs: false,
      };
    }
    
    // Fix for Three.js
    config.externals.push({
      bufferutil: 'bufferutil',
      'utf-8-validate': 'utf-8-validate',
    });
    
    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : '../analyze/client.html',
        })
      );
    }
    
    return config;
  },
  
  // Experimental features
  experimental: {
    optimizeCss: true,
  }
};

module.exports = nextConfig;