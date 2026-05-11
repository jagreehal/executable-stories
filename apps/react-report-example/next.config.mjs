/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["executable-stories-react", "executable-stories-formatters"],
  serverExternalPackages: ["marked", "isomorphic-dompurify", "dompurify"],
};

export default nextConfig;
