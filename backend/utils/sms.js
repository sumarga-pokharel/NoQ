import twilio from 'twilio';

let twilioClient;

// Format-checked, not just presence-checked: a copy-pasted placeholder from
// .env.example (e.g. TWILIO_MESSAGING_SERVICE_SID=MGxxxx...) is non-empty
// but not a real resource, and would otherwise pass the old truthy check
// straight into a guaranteed-failing live API call instead of falling back
// to the simulated/logged path below.
const ACCOUNT_SID_RE = /^AC[0-9a-f]{32}$/i;
const AUTH_TOKEN_RE = /^[0-9a-f]{32}$/i;
const MESSAGING_SERVICE_SID_RE = /^MG[0-9a-f]{32}$/i;
const FROM_NUMBER_RE = /^\+[1-9]\d{7,14}$/;

const configured = () =>
  ACCOUNT_SID_RE.test(process.env.TWILIO_ACCOUNT_SID || '') &&
  AUTH_TOKEN_RE.test(process.env.TWILIO_AUTH_TOKEN || '') &&
  (MESSAGING_SERVICE_SID_RE.test(process.env.TWILIO_MESSAGING_SERVICE_SID || '') ||
    FROM_NUMBER_RE.test(process.env.TWILIO_FROM_NUMBER || ''));

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

// Twilio trial accounts reject any custom message body outright (error
// 572006) and only accept one of a fixed set of template names — see
// https://www.twilio.com/docs/usage/trials/try-out-sms. Set this env var
// to one of those names (e.g. "sms_appointment_reminders") to keep real
// sends landing on phones during a trial-account demo; the recipient gets
// Twilio's canned reminder text instead of NoQ's actual message. Remove
// it once the account is upgraded to paid so the real message goes out.
const TRIAL_TEMPLATE_BODY = (process.env.TWILIO_TRIAL_TEMPLATE_BODY || '').trim();

export const sendSms = async (toPhone, message) => {
  const to = normalizePhone(toPhone);
  const client = getClient();

  if (!client) {
    console.log(`[SMS simulated] To ${masked(to)}: ${message}`);
    return { delivered: false, simulated: true, to };
  }

  try {
    const sender = MESSAGING_SERVICE_SID_RE.test(process.env.TWILIO_MESSAGING_SERVICE_SID || '')
      ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }
      : { from: process.env.TWILIO_FROM_NUMBER };
    const body = TRIAL_TEMPLATE_BODY || message;
    const result = await client.messages.create({ body, to, ...sender });
    return { delivered: true, sid: result.sid, status: result.status, to, usedTrialTemplate: Boolean(TRIAL_TEMPLATE_BODY) };
  } catch (error) {
    console.error(`SMS delivery failed for ${masked(to)}:`, error.message);
    return { delivered: false, error: error.message, code: error.code, to };
  }
};

export const isSmsConfigured = configured;
