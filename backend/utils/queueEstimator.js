import Ticket from '../models/Ticket.js';

/**
 * How many people are ahead of a ticket within its provider's active queue.
 * Emergency + priority tickets are treated as ahead of regular ones, mirroring
 * how counters are told to call people.
 */
export const getPositionInfo = async (ticket) => {
  const activeStatuses = ['waiting', 'called'];

  const aheadQuery = {
    provider: ticket.provider,
    status: { $in: activeStatuses },
    _id: { $ne: ticket._id },
    $or: [
      { isEmergency: true },
      { priority: true },
      {
        isEmergency: ticket.isEmergency,
        priority: ticket.priority,
        createdAt: { $lt: ticket.createdAt },
      },
    ],
  };

  // If this ticket itself is emergency/priority, only count same-or-higher tier ahead of it
  if (ticket.isEmergency) {
    aheadQuery.$or = [{ isEmergency: true, createdAt: { $lt: ticket.createdAt } }];
  } else if (ticket.priority) {
    aheadQuery.$or = [{ isEmergency: true }, { priority: true, createdAt: { $lt: ticket.createdAt } }];
  }

  const ahead = await Ticket.countDocuments(aheadQuery);
  return { ahead };
};

/**
 * Range estimate in minutes: narrows as avgMinutes is refined by real serving data
 * and widens with queue depth/variance. Kept simple and transparent on purpose.
 */
export const estimateWaitRange = (ahead, avgMinutes) => {
  const base = ahead * avgMinutes;
  const min = Math.max(0, Math.round(base * 0.8));
  const max = Math.round(base * 1.3 + avgMinutes * 0.5);
  return { min, max };
};

/**
 * Generates the next sequential token for a service prefix, e.g. B-24 -> B-25.
 * Scoped to "today" so numbering resets daily per office.
 */
export const nextToken = async (providerId, prefix) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const last = await Ticket.findOne({
    provider: providerId,
    token: new RegExp(`^${prefix}-\\d+$`),
    createdAt: { $gte: startOfDay },
  })
    .sort({ sequence: -1 })
    .lean();

  const sequence = last ? last.sequence + 1 : 1;
  return { token: `${prefix}-${sequence}`, sequence };
};
