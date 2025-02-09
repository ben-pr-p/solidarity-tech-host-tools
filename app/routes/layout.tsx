import { Outlet } from "react-router";
import { config } from "@/config.server";
import type { Route } from "./+types/layout";

export async function loader() {
  return {
    title: config.APP_TITLE,
    headerBackgroundColor: config.HEADER_BACKGROUND_COLOR,
    headerTextColor: config.HEADER_TEXT_COLOR,
  };
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <header
        className="text-center p-4"
        style={{
          backgroundColor: loaderData.headerBackgroundColor,
          color: loaderData.headerTextColor,
        }}
      >
        <h1 className="text-3xl font-bold uppercase">{loaderData.title}</h1>
      </header>
      <div className="container mx-auto p-4">
        <Outlet />
      </div>
    </>
  );
}
