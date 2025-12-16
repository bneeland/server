import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";

const sesClient = new SESv2Client({
  region: "us-west-2",
  // Credentials loaded from environment variables automatically
});

export async function sendEmail({
  toAddresses,
  subject,
  body,
}: {
  toAddresses: string[];
  subject: string;
  body: {
    text: string;
    html: string;
  };
}) {
  const command = new SendEmailCommand({
    FromEmailAddress: "hello@emberline.app",
    Destination: {
      ToAddresses: toAddresses,
    },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: body.text, Charset: "UTF-8" },
          Html: { Data: body.html, Charset: "UTF-8" },
        },
      },
    },
  });

  sesClient.send(command);
}
