import LoginBlock from "@/blocks/login";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { languageDetector } from "hono/language";
import { users } from "./infra/schema";
import { renderer } from "./renderer";

type Bindings = {
  D1: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  languageDetector({
    supportedLanguages: ["en", "ja"],
    fallbackLanguage: "en",
  }),
);

app.use(renderer);

app.get("/", (c) => {
  return c.render(<LoginBlock />);
});

app.get("/debug/users", async (c) => {
  const db = drizzle(c.env.D1);
  const rows = await db.select().from(users).all();

  return c.json(rows, 200);
});

export default app;
