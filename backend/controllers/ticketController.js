import asyncHandler from 'express-async-handler';
import Ticket from '../models/Ticket.js';
import Service from '../models/Service.js';
import Counter from '../models/Counter.js';
import { nextToken } from '../utils/queueEstimator.js';
import { emitQueueUpdate } from '../sockets/index.js';

// Builds the full snapshot used by the Dashboard and the public Display board.
// Exported so counterController / publicController can push fresh state over sockets.
export const buildDashboardSnapshot = async (providerId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [waiting, counters, servedToday, noShowToday, issuedToday] = await Promise.all([
    Ticket.find({ provider: providerId, status: { $in: ['waiting', 'called'] } })
      .populate('service')
      .sort({ isEmergency: -1, priority: -1, createdAt: 1 }),
    Counter.find({ provider: providerId }).populate('currentTicket').populate('compatibleServices'),
    Ticket.countDocuments({ provider: providerId, status: 'done', completedAt: { $gte: startOfDay } }),
    Ticket.countDocuments({ provider: providerId, status: 'no-show', createdAt: { $gte: startOfDay } }),
    Ticket.countDocuments({ provider: providerId, createdAt: { $gte: startOfDay } }),
  ]);

  const avgWait =
    waiting.length && waiting[0].service
      ? Math.round(
          waiting.reduce((sum, t, i) => sum + i * (t.service?.avgMinutes || 5), 0) / waiting.length
        )
      : 0;

  return {
    waitingCount: waiting.length,
    documentsReadyCount: waiting.filter((ticket) => ticket.documents.every((document) => document.confirmed)).length,
    counters,
    servedToday,
    noShowToday,
    issuedToday,
    avgWaitMinutes: avgWait,
  };
};

// @desc  Full dashboard snapshot (stats + counters + waiting list)
// @route GET /api/tickets/dashboard
export const getDashboard = asyncHandler(async (req, res) => {
  const snapshot = await buildDashboardSnapshot(req.provider._id);
  res.json(snapshot);
});

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc  Paginated and filtered active queue for the staff dashboard
// @route GET /api/tickets/waiting
export const getWaitingTickets = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(5, Number.parseInt(req.query.limit, 10) || 10));
  const query = { provider: req.provider._id };

  if (['waiting', 'called', 'serving'].includes(req.query.status)) query.status = req.query.status;
  else query.status = { $in: ['waiting', 'called', 'serving'] };
  if (req.query.service) query.service = req.query.service;
  if (req.query.priority === 'priority') query.priority = true;
  if (req.query.priority === 'regular') query.priority = false;
  if (req.query.search?.trim()) {
    const search = new RegExp(escapeRegExp(req.query.search.trim().slice(0, 60)), 'i');
    query.$or = [{ token: search }, { phone: search }];
  }

  const total = await Ticket.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const tickets = await Ticket.find(query)
    .populate('service', 'name prefix')
    .populate('counter', 'name')
    .sort({ isEmergency: -1, priority: -1, createdAt: 1 })
    .skip((safePage - 1) * limit)
    .limit(limit);

  res.json({ tickets, page: safePage, limit, total, totalPages });
});

// @desc  Staff manually issues a token for a walk-in visitor
// @route POST /api/tickets/walk-in
export const createWalkIn = asyncHandler(async (req, res) => {
  const { serviceId, priority } = req.body;

  if (!serviceId) {
    res.status(400);
    const error = new Error('Service is required');
    error.fields = { serviceId: error.message };
    throw error;
  }

  const service = await Service.findOne({ _id: serviceId, provider: req.provider._id, isActive: true });
  if (!service) {
    res.status(404);
    throw new Error('Active service not found');
  }

  const { token, sequence } = await nextToken(req.provider._id, service.prefix);

  const ticket = await Ticket.create({
    provider: req.provider._id,
    service: service._id,
    token,
    sequence,
    priority: !!priority,
    isEmergency: service.isEmergency,
    documents: (req.provider.requiredDocuments || []).map((d) => ({ name: d.name, confirmed: true })),
  });

  const snapshot = await buildDashboardSnapshot(req.provider._id);
  emitQueueUpdate(req.provider._id, snapshot);

  res.status(201).json({ ticket });
});
