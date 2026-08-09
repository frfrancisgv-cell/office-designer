import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  transpilePackages: ['motion'],

  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    // psalmtone.js uses implicit global var declarations that break
    // when webpack bundles/minifies in strict mode. Load it as an
    // external so Node.js require() loads the raw file at runtime.
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : []),
      ({ request }: { request?: string }, callback: Function) => {
        if (request && request.includes('psalmtone.js')) {
          return callback(null, 'commonjs ' + require('path').resolve(__dirname, 'psalmtone.js'));
        }
        callback();
      },
    ];
    return config;
  },
};

export default nextConfig;
