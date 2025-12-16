import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { db } from "../database/client.js";
import * as schema from "../database/schema.js";
import { expo } from "@better-auth/expo";
import { sendEmail } from "../email/client.js";
import { allowedOrigins } from "../common.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: allowedOrigins,
  // Docs: https://www.better-auth.com/docs/integrations/hono
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        console.log("email");
        console.log(email);
        console.log("otp");
        console.log(otp);
        console.log("type");
        console.log(type);
        if (type === "sign-in") {
          // Send the OTP for sign in
          await sendEmail({
            toAddresses: [email],
            subject: "Sign-in verification code",
            body: {
              text: `Your Emberline sign-in verification code: ${otp}`,
              html: `<div>Your Emberline sign-in verification code: ${otp}</div>`,
            },
          });
        } else if (type === "email-verification") {
          // Send the OTP for email verification
          await sendEmail({
            toAddresses: [email],
            subject: "Email verification code",
            body: {
              text: `Your Emberline email verification code: ${otp}`,
              html: `<div>Your Emberline email verification code: ${otp}</div>`,
            },
          });
        } else {
          // Send the OTP for password reset
        }
      },
    }),
    expo(),
  ],
});
