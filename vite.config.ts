import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { cloudflareDevProxy } from "@react-router/dev/vite/cloudflare"; // add this

import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    cloudflareDevProxy(),
    tailwindcss(),
    reactRouterHonoServer({ runtime: "cloudflare" }),
    reactRouter(),
    tsconfigPaths(),
  ],
});
