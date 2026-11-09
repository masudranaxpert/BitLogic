import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets a second dev server run side by side without sharing the .next cache.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  webpack: (config, {dev}) => {
    if (!dev) return config;
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (process.env.DISABLE_HMR === 'true') {
      config.watchOptions = { ignored: /.*/ };
      return config;
    }
    // SQLite writes (supplier sync, sessions) must not rebuild every page.
    // Bun's watcher follows those files; Node's usually does not.
    // This Next build only accepts glob strings here, not a RegExp in the array.
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/.git/**',
        '**/.next/**',
        '**/node_modules/**',
        '**/*.db',
        '**/*.db-*',
      ],
    };
    return config;
  },
};

export default nextConfig;
