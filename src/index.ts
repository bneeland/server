import express from "express";
import dotenv from "dotenv";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth/client.js";
import cors from "cors";
import { origins } from "./lib/common.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: origins, // Replace with your frontend's origin
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

app.post("/api/auth/email-otp/send-verification-otp", async (req, res) => {
  // app.post("/api/sign-in/get-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Must provide an email" });
  }

  try {
    const data = await auth.api.sendVerificationOTP({
      body: {
        email, // required
        type: "sign-in", // required
      },
    });
    console.log("data");
    console.log(data);

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("error");
    console.error(error);
    return res.status(error.statusCode).json(error.body);
  }
});

app.post("/api/test", async (req, res) => {
  console.log("req.body");
  console.log(req.body);

  res.send("Hello, TypeScript with Express!");
});

app.post("/api/auth/email-otp/send-verification-otp", async (req, res) => {
  // app.post("/api/sign-in/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const data = await auth.api.signInEmailOTP({
      body: {
        email,
        otp,
      },
    });
    console.log("data");
    console.log(data);

    res.status(200).json(data);
  } catch (error: any) {
    console.error("error");
    console.error(error);
    return res.status(error.statusCode).json(error.body);
  }
});

app.use(express.json()); // Must be after /api/auth/… route handler

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
