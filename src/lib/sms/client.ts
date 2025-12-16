import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({
  region: "us-east-1",
  // Credentials loaded from .env file automatically
});

export async function sendSms({
  phoneNumber,
  message,
}: {
  phoneNumber: string; // E.164 format, e.g. "+14155552671"
  message: string;
}) {
  const command = new PublishCommand({
    PhoneNumber: phoneNumber,
    Message: message,

    // Optional but recommended
    MessageAttributes: {
      "AWS.SNS.SMS.SMSType": {
        DataType: "String",
        StringValue: "Transactional", // or "Promotional"
      },
      // Optional sender ID (not supported in all countries)
      "AWS.SNS.SMS.SenderID": {
        DataType: "String",
        StringValue: "Emberline",
      },
    },
  });

  return snsClient.send(command);
}
