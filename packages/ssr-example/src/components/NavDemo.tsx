import { ssr } from "../../config";
import NavDemoIsland from "./NavDemo.island";

type View = "alpha" | "beta";

const parseView = (value: string | undefined): View =>
  value === "beta" ? "beta" : "alpha";

export default ssr(async (c) => {
  c.get("page").title = "Nav Demo";

  const initialView = parseView(c.req.query("view"));

  return () => <NavDemoIsland initialView={initialView} />;
});
