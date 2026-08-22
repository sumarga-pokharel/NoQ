import twilio from 'twilio';

let twilioClient;

const configured = () =>
  Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID)
  );

const getClient = () => {
  if (!configured()) return null;
  if (!twilioClient) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

export const normalizePhone = (value) => {
  let phone = String(value || '').trim().replace(/[\s()-]/g, '');
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`;
  else if (phone.startsWith('977')) phone = `+${phone}`;
  else if (!phone.startsWith('+')) {
    phone = phone.replace(/^0+/, '');
    phone = `${process.env.SMS_DEFAULT_COUNTRY_CODE || '+977'}${phone}`;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    const error = new Error('Enter a valid mobile number, including country code when outside Nepal');
    error.status = 400;
    error.fields = { phone: error.message };
    throw error;
  }
  return phone;
};

const masked = (phone) => `${phone.slice(0, 4)}…${phone.slice(-3)}`;

export const sendSms = async (toPhone, message) => {
  const to = normalizePhone(toPhone);
  const client = getClient();

  if (!client) {
    console.log(`[SMS simulated] To ${masked(to)}: ${message}`);
    return { delivered: false, simulated: true, to };
  }

  try {
    const sender = process.env.TWILIO_MESSAGING_SERVICE_SID
      ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }
      : { from: process.env.TWILIO_FROM_NUMBER };
    const result = await client.messages.create({ body: message, to, ...sender });
    return { delivered: true, sid: result.sid, status: result.status, to };
  } catch (error) {
    console.error(`SMS delivery failed for ${masked(to)}:`, error.message);
    return { delivered: false, error: error.message, code: error.code, to };
  }
};

export const isSmsConfigured = configured;
