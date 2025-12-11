/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Uncomment and add your hosted manifest ID after generating it at:
  // https://farcaster.xyz/~/developers/mini-apps/manifest
  // async redirects() {
  //   return [
  //     {
  //       source: '/.well-known/farcaster.json',
  //       destination: 'https://api.farcaster.xyz/miniapps/hosted-manifest/YOUR_MANIFEST_ID',
  //       permanent: false,
  //     },
  //   ]
  // },
}

module.exports = nextConfig
