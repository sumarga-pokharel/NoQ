// Minimal SMS sender. Wires up to Twilio when credentials are present in .env;
// otherwise it just logs, so the rest of the app works out of the box in dev.
// To enable real SMS: `npm install twilio` and fill in the TWILIO_* vars in .env.

let twilioClient = null;

const getClient = async () => {
  if (twilioClient) return twilioClient;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;

  const { default: twilio } = await import('twilio');
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return twilioClient;
};

export const sendSms = async (toPhone, message) => {
  try {
    const client = await getClient();
    if (!client) {
      console.log(`[SMS - dev mode, no Twilio configured] To: ${toPhone} | ${message}`);
      return { simulated: true };
    }
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to: toPhone.startsWith('+') ? toPhone : `+977${toPhone}`,
    });
    return { sid: result.sid };
  } catch (err) {
    console.error('SMS send failed:', err.message);
    return { error: err.message };
  }
};
