import express from "express";
import dotenv from "dotenv";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth/auth";
import cors from "cors";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://your-frontend-domain.com", // Replace with your frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  }),
  express.json(),
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

app.get("/api/sign-in/send-otp", async (req, res) => {
  const data = await auth.api.sendVerificationOTP({
    body: {
      email: "hello@example.com", // required
      type: "sign-in", // required
    },
  });

  return res.json(data);
});

app.post("/api/test", async (req, res) => {
  console.log("req.body");
  console.log(req.body);

  res.send("Hello, TypeScript with Express!");
});

app.post("/api/sign-in/verify-otp", async (req, res) => {
  const { otp } = req.body;

  const data = await auth.api.signInEmailOTP({
    body: {
      email: "hello@example.com",
      otp,
    },
  });

  res.send(data);
});

app.use(express.json()); // Must be after /api/auth/… route handler

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
