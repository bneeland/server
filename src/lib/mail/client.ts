import nodemailer from "nodemailer";

export const mailClient = nodemailer.createTransport({
  host: "email-smtp.us-west-2.amazonaws.com",
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.AWS_SES_SMTP_USER_NAME,
    pass: process.env.AWS_SES_SMTP_PASSWORD,
  },
});
