/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable strict mode to reduce console warnings
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    // WASM support for fhevmjs - FIXED for 0.6.2
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
      layers: true,
    };
    
    // Copy WASM files to public directory
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/wasm/[name].[hash][ext]',
      },
    });
    
    // Ignore warnings from WalletConnect/wagmi dependencies
    config.ignoreWarnings = [
      { module: /node_modules\/pino/ },
      { module: /node_modules\/@walletconnect/ },
      /Failed to parse source map/,
    ];
    
    return config;
  },
  // Suppress hydration warnings
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },
};

export default nextConfig;
