import express from "express";
import dotenv from "dotenv";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth/client.js";
import cors from "cors";
import { allowedOrigins } from "./lib/common.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(
  cors({
    origin: allowedOrigins, // Replace with your frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  }),
  express.urlencoded({ extended: true }),
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.get("/", (req, res) => {
  res.send("Hello, TypeScript with Express!");
});

app.get("/api/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  return res.json(session);
});

app.get("/api/cron", async (req, res) => {
  if (req.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end("Unauthorized");
  }

  console.log("cron job ran");

  res.end();
});

app.use(express.json()); // Must be after /api/auth/… route handler

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
