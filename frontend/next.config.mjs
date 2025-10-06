/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable strict mode to reduce console warnings
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    // Ignore warnings from WalletConnect/wagmi dependencies
    config.ignoreWarnings = [
      { module: /node_modules\/pino/ },
      { module: /node_modules\/@walletconnect/ }
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
