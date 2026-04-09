import { Hono } from "hono";

export const api = new Hono().get("/msg", (c) =>
  c.json({ message: "Hello from Hono!", time: Date.now() }),
);

export type ApiType = typeof api;
