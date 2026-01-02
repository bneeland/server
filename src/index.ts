import express from "express";
import dotenv from "dotenv";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth/client.js";
import cors from "cors";
import { allowedOrigins, lastLocalTime } from "./lib/common.js";
import { db } from "./lib/database/client.js";
import { checkin, contact, setting, user } from "./lib/database/schema.js";
import { and, desc, eq } from "drizzle-orm";
import { roundToNearestMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { sendSms } from "./lib/sms/client.js";
import { sendEmail } from "./lib/email/client.js";

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
  console.log("session in get-user-setting");
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

  console.log("req.body");
  console.log(req.body);

  if (req.body.checkinDeadlineTime) {
    if (Number(req.body.checkinDeadlineTime.split(":")[1]) % 15 !== 0) {
      return res.status(400).json({
        message: "Check-in deadline time must be in 15-minute increments",
      });
    }
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

app.get("/api/contacts/get-user-contacts", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  console.log("session");
  console.log(session);

  if (!session) {
    return res.status(401).end();
  }

  const contacts = await db
    .select()
    .from(contact)
    .where(eq(contact.userId, session.user.id))
    .orderBy(desc(contact.createdAt));
  console.log("contacts");
  console.log(contacts);

  return res.status(200).json({ contacts });
});

app.post("/api/contacts/upsert-user-contact", async (req, res) => {
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

  if (!req.body.name) {
    return res.status(400).json({ message: "Must provide name" });
  }

  if (!req.body.email && !req.body.phoneNumber) {
    return res
      .status(400)
      .json({ message: "Must provide an email or a phone number, or both" });
  }

  try {
    const upserted = await db
      .insert(contact)
      .values({
        userId: session.user.id,
        ...req.body,
      })
      .onConflictDoUpdate({
        target: contact.id,
        set: {
          name: req.body.name,
          email: req.body.email,
          phoneNumber: req.body.phoneNumber,
        },
      });
    console.log("upserted");
    console.log(upserted);

    return res.status(200).json({ contact: upserted });
  } catch (err: any) {
    console.error(err);

    return res.status(400).json({ message: err.message || "Update failed" });
  }
});

app.delete("/api/contacts/delete-user-contact", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  console.log("session");
  console.log(session);

  if (!session) {
    return res.status(401).end();
  }

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Must provide a contact ID" });
  }

  try {
    const deleted = await db
      .delete(contact)
      .where(and(eq(contact.userId, session.user.id), eq(contact.id, id)));
    console.log("deleted");
    console.log(deleted);

    return res.status(200).json({ contact: deleted });
  } catch (err: any) {
    console.error(err);

    return res.status(400).json({ message: err.message || "Update failed" });
  }
});

app.get("/api/cron", async (req, res) => {
  try {
    if (req.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).end("Unauthorized");
    }

    console.log("cron job ran");

    const nowFloored = roundToNearestMinutes(new Date(), {
      nearestTo: 5,
      roundingMethod: "floor",
    });
    console.log("nowFloored");
    console.log(nowFloored);

    const settings = await db
      .select()
      .from(setting)
      .where(eq(setting.checkinsEnabled, true));
    console.log("settings");
    console.log(settings);

    let applicableSettings = [];

    for (const setting of settings) {
      const nowFlooredTimeZone = formatInTimeZone(
        nowFloored,
        setting.timeZone,
        "HH:mm:ss",
      );
      console.log("nowFlooredTimeZone");
      console.log(nowFlooredTimeZone);

      if (setting.checkinDeadlineTime === nowFlooredTimeZone) {
        applicableSettings.push(setting);
      }
    }
    console.log("applicableSettings");
    console.log(applicableSettings);

    for (const setting of applicableSettings) {
      const [lastCheckin] = await db
        .select()
        .from(checkin)
        .where(eq(checkin.userId, setting.userId))
        .orderBy(desc(checkin.createdAt))
        .limit(1);
      console.log("lastCheckin");
      console.log(lastCheckin);

      const lastCheckinResetTime = lastLocalTime(
        setting.checkinResetTime,
        setting.timeZone,
      );
      console.log("lastCheckinResetTime");
      console.log(lastCheckinResetTime);

      const lastCheckinDeadlineTime = lastLocalTime(
        setting.checkinDeadlineTime,
        setting.timeZone,
      );
      console.log("lastCheckinDeadlineTime");
      console.log(lastCheckinDeadlineTime);

      const lastCheckinDate = new Date(lastCheckin.createdAt);

      if (
        !(
          lastCheckinDate >= lastCheckinResetTime &&
          lastCheckinDate <= lastCheckinDeadlineTime
        )
      ) {
        console.log("did not check in on time");

        const contacts = await db
          .select()
          .from(contact)
          .where(eq(contact.userId, setting.userId));
        console.log("contacts");
        console.log(contacts);

        if (contacts.length > 0) {
          const [userFound] = await db
            .select()
            .from(user)
            .where(eq(user.id, setting.userId));
          console.log("userFound");
          console.log(userFound);

          const message = `this is an emergency message sent to you as the emergency contact for ${userFound.name || userFound.email}`;

          for (const contact of contacts) {
            if (contact.phoneNumber) {
              await sendSms({
                phoneNumber: contact.phoneNumber,
                // phoneNumber: "+17802437675",
                message,
              });
            }

            if (contact.email) {
              await sendEmail({
                toAddresses: [contact.email],
                // toAddresses: ["brian@neeland.org"],
                subject: "emergency contact email",
                body: {
                  text: message,
                  html: `<div>${message}</div>`,
                },
              });
            }
          }
        }
      } else {
        console.log("did check in on time");
      }
    }

    res.status(200).send("Cron job executed successfully");
  } catch (error) {
    console.error(error);

    res.status(500).send("Cron job had an error");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
