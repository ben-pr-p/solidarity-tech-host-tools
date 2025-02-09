// import { createHonoServer as createHonoServerBun } from "react-router-hono-server/bun";
import { type Context } from "hono";
import { createHonoServer as createHonoServerCloudflare } from "react-router-hono-server/cloudflare";
import { getConfig } from "./config.server";

export function getLoadContext(c: Context) {
  return {
    env: getConfig(c.env as Record<string, string>),
  };
}

export default await createHonoServerCloudflare({
  getLoadContext,
});

declare module "react-router" {
  interface AppLoadContext extends ReturnType<typeof getLoadContext> {}
}
