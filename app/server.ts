// import { createHonoServer as createHonoServerBun } from "react-router-hono-server/bun";
import { createHonoServer as createHonoServerCloudflare } from "react-router-hono-server/cloudflare";

export default await createHonoServerCloudflare({
  async beforeAll() {
    // Just make sure the worker is started
    // await startWorker();
  },
});
