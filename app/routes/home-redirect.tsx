import { redirect } from "react-router";
import type { Route } from "./+types/home-redirect";
import { config } from "@/config.server";

export async function loader({ context }: Route.LoaderArgs) {
  return redirect(config.ROOT_REDIRECT_URL, {
    status: 302,
  });
}
