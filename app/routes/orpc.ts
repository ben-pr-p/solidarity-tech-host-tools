import { RPCHandler } from "@orpc/server/fetch";
import { router } from "@/orpc/router.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import type { Config } from "@/config.server";

const rpcHandler = new RPCHandler(router);

async function handleRequest(request: Request, env: Config) {
  const { response } = await rpcHandler.handle(request, {
    prefix: "/orpc",
    context: {
      env,
    },
  });
  return response;
}

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  return await handleRequest(request, context.env);
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  return await handleRequest(request, context.env);
};
