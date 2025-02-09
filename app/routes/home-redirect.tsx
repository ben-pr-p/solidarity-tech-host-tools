import { redirect } from "react-router";
import { config } from "@/config.server";

export async function loader() {
  return redirect(config.ROOT_REDIRECT_URL, { status: 302 });
}
