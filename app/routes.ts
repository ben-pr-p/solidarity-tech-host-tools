import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home-redirect.tsx"),
  layout("routes/layout.tsx", [
    route("/host", "routes/host.tsx"),
    route("/admin", "routes/admin.tsx"),
  ]),
  route("/orpc/*", "routes/orpc.ts"),
] satisfies RouteConfig;
