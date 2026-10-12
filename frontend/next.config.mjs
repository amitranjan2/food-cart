/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The policy pages were first published on the Hostinger website under these addresses (and the vendor app links to
  // them). Once the storefront serves suprmama.in, the same addresses keep working.
  async redirects() {
    return [
      { source: '/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/terms-and-conditions', destination: '/terms', permanent: true },
      { source: '/refund-policy', destination: '/refunds', permanent: true },
    ];
  },
};
export default nextConfig;
