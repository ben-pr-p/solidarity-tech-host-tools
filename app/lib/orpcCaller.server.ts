import { createORPCReactQueryUtils } from "@orpc/react-query";
import { createRouterClient } from "@orpc/server";
import { router } from "@/orpc/router.server";
import { QueryClient, dehydrate } from "@tanstack/react-query";
import { type Config } from "@/config.server";

export const getORPCCallerQuery = (env: Config) =>
  createORPCReactQueryUtils(
    createRouterClient(router, {
      context: {
        env,
      },
    })
  );

type WithPrefetchFn<T> = (
  queryClient: QueryClient,
  orpc: ReturnType<typeof getORPCCallerQuery>
) => Promise<T>;

export async function withPrefetch<T>(env: Config, fn: WithPrefetchFn<T>) {
  const queryClient = new QueryClient();
  const result = await fn(queryClient, getORPCCallerQuery(env));
  const dehydratedState = dehydrate(queryClient);
  return { ...result, __dehydratedState: dehydratedState };
}
