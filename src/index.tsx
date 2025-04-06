import { blocks } from "@/blocks";
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
  return c.render(
    <>Hello</>
  );
});

app.get("/signup", (c) => {
  return c.render(<blocks.signup />);
});

app.post("/signup", async (c) => {
  const { email, accept_terms, accept_privacy_policy } = await c.req.parseBody();

  if (!email || !accept_terms || !accept_privacy_policy) {
    return c.json({ error: "Invalid input" }, 400);
  }

  return c.json({ message: "Send xxx" }, 201);
});

app.get("/terms", (c) => {
  return c.render(
    <>
      <h1>Terms of Service</h1>
      <p>TODO</p>
    </>
  );
});

app.get("/privacy_policy", (c) => {
  return c.render(
    <>
      <h1>Privacy Policy</h1>
      <p>TODO</p>
    </>
  );
});

app.get("/debug/users", async (c) => {
  const db = drizzle(c.env.D1);
  const rows = await db.select().from(users).all();

  return c.json(rows, 200);
});

export default app;