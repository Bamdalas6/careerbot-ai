import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist ships a separate worker file and, in this build, expects to
  // resolve it from node_modules at runtime. Bundling it into the server chunk
  // breaks that lookup ("Cannot find module pdf.worker.mjs"), so we keep it
  // external and let the CV-extract route import it straight from node_modules.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
