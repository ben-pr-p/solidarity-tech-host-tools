import { redirect } from "react-router";
import type { Route } from "./+types/home-redirect";

export async function loader({ context }: Route.LoaderArgs) {
  return redirect(context.env.ROOT_REDIRECT_URL, {
    status: 302,
  });
}
