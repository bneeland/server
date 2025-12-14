import express from "express";
import dotenv from "dotenv";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth/client.js";
import cors from "cors";
import { allowedOrigins } from "./lib/common.js";
import { db } from "./lib/database/client.js";
import { checkin, setting } from "./lib/database/schema.js";
import { desc, eq } from "drizzle-orm";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(
  cors({
    origin: allowedOrigins, // Replace with your frontend's origin
    methods: ["GET", "POST", "PATCH", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  }),
  express.urlencoded({ extended: true }),
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json()); // Must be after /api/auth/… route handler

// app.get("/", (req, res) => {
//   res.send("Hello, TypeScript with Express!");
// });

// app.get("/api/me", async (req, res) => {
//   const session = await auth.api.getSession({
//     headers: fromNodeHeaders(req.headers),
//   });

//   return res.json(session);
// });

app.get("/api/settings/get-user-setting", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  console.log("session");
  console.log(session);

  if (!session) {
    return res.status(401).end();
  }

  const settingsFound = await db
    .select()
    .from(setting)
    .where(eq(setting.userId, session.user.id));
  console.log("settingsFound");
  console.log(settingsFound);

  if (settingsFound.length > 0) {
    const _setting = settingsFound.find((s) => s.userId === session.user.id);
    return res.status(200).json({ setting: _setting });
  } else {
    const _setting = await db.insert(setting).values({
      userId: session.user.id,
    });

    return res.status(201).json({ setting: _setting });
  }
});

app.patch("/api/settings/update-user-setting", async (req, res) => {
  console.log("req.body");
  console.log(req.body);

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  console.log("session");
  console.log(session);

  if (!session) {
    return res.status(401).end();
  }

  try {
    const updated = await db
      .update(setting)
      .set({
        ...req.body,
      })
      .where(eq(setting.userId, session.user.id))
      .returning();
    console.log("updated");
    console.log(updated);

    if (updated.length === 0) {
      return res.status(404).json({ message: "User settings not found" });
    }

    return res.status(200).json({ setting: updated[0] });
  } catch (err: any) {
    console.error(err);

    return res.status(400).json({ message: err.message || "Update failed" });
  }
});

app.get("/api/checkins/get-user-checkins", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  console.log("session");
  console.log(session);

  if (!session) {
    return res.status(401).end();
  }

  const checkins = await db
    .select()
    .from(checkin)
    .where(eq(checkin.userId, session.user.id))
    .orderBy(desc(checkin.createdAt));
  console.log("checkins");
  console.log(checkins);

  return res.status(200).json({ checkins });
});

app.post("/api/checkins/create-user-checkin", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  console.log("session");
  console.log(session);

  if (!session) {
    return res.status(401).end();
  }

  try {
    const created = await db.insert(checkin).values({
      userId: session.user.id,
    });
    console.log("created");
    console.log(created);

    return res.status(200).json({ checkin: created });
  } catch (err: any) {
    console.error(err);

    return res.status(400).json({ message: err.message || "Update failed" });
  }
});

app.get("/api/cron", async (req, res) => {
  if (req.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end("Unauthorized");
  }

  console.log("cron job ran");

  res.end();
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
