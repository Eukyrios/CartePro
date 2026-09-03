import path from "path";
import type { NextConfig } from "next";
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

const nextConfig: NextConfig = {
  /*
   * Ship a self-contained server, so CI can publish a bundle that runs with
   * `node server.js` and nothing to install — the whole point of the build
   * artifact. Its companion is outputFileTracingRoot below.
   */
  output: "standalone",

  /*
   * Pin the file-tracing root to this folder. Next otherwise walks up looking
   * for the workspace root and stops at the first package-lock.json it finds,
   * which on a machine with a stray lockfile in $HOME is the home directory:
   * the standalone bundle then traces the wrong tree, and even a plain build
   * fails while collecting page data.
   */
  outputFileTracingRoot: path.join(__dirname),
};

export default withFlowbiteReact(nextConfig);
