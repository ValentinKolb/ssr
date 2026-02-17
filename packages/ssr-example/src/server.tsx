import { Hono } from "hono";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { routes } from "@valentinkolb/ssr/hono";
import { config, html } from "../config";
import Home from "./components/Home";
import About from "./components/About";
import ApiFetchIsland from "./components/ApiFetch.island";

const api = new Hono().get("/data", (c) =>
  c.json({ message: "Hello from Hono!", time: Date.now() }),
);

const app = new Hono()
  .use(logger())
  .route("/_ssr", routes(config))
  .route("/api", api)
  .use("/public/*", serveStatic({ root: "./" }))
  .get("/", ...Home)
  .get("/about", ...About)
  .get("/api-test", () => html(<ApiFetchIsland />));

export type ApiType = typeof api;
export default app;
