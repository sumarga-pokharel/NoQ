import Provider from '../models/Provider.js';
import Ticket from '../models/Ticket.js';
import { estimateWaitRange, getPositionInfo } from './queueEstimator.js';
import { sendSms } from './sms.js';

export const sendCalledSms = async (ticket) => {
  if (!ticket.notifySms || !ticket.phone || ticket.smsCalledSentAt) return;
  const provider = await Provider.findById(ticket.provider).select('officeName');
  const result = await sendSms(
    ticket.phone,
    `NoQ: ${ticket.token}, it is your turn at ${provider?.officeName || 'the office'}. Please approach the counter.`
  );
  if (result.delivered || result.simulated) {
    ticket.smsCalledSentAt = new Date();
    await ticket.save();
  }
};

export const notifyNearbyTickets = async (providerId) => {
  const tickets = await Ticket.find({
    provider: providerId,
    status: 'waiting',
    notifySms: true,
    phone: { $ne: '' },
    smsNearSentAt: null,
  }).populate('service');
  if (!tickets.length) return;

  const provider = await Provider.findById(providerId).select('officeName');
  for (const ticket of tickets) {
    const { ahead } = await getPositionInfo(ticket);
    if (ahead > 3) continue;
    const estimate = estimateWaitRange(ahead, ticket.service?.avgMinutes || 5);
    const result = await sendSms(
      ticket.phone,
      `NoQ: ${ticket.token}, you are almost up at ${provider?.officeName || 'the office'}. ${ahead} ahead, about ${estimate.min}-${estimate.max} min.`
    );
    if (result.delivered || result.simulated) {
      ticket.smsNearSentAt = new Date();
      await ticket.save();
    }
  }
};
