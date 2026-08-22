import asyncHandler from 'express-async-handler';
import Provider from '../models/Provider.js';
import Service from '../models/Service.js';
import Ticket from '../models/Ticket.js';
import Counter from '../models/Counter.js';
import { nextToken, getPositionInfo, estimateWaitRange } from '../utils/queueEstimator.js';
import { emitQueueUpdate, emitTicketUpdate } from '../sockets/index.js';
import { buildDashboardSnapshot } from './ticketController.js';
import { sendSms } from '../utils/sms.js';

const getProviderBySlug = async (slug) => {
  const provider = await Provider.findOne({ slug });
  if (!provider) {
    const err = new Error('Office not found');
    err.status = 404;
    throw err;
  }
  return provider;
};

// @desc  What a visitor sees right after scanning the QR: services + documents
// @route GET /api/public/offices/:slug
export const getOfficeBySlug = asyncHandler(async (req, res) => {
  const provider = await getProviderBySlug(req.params.slug);
  const services = await Service.find({ provider: provider._id, isActive: true });

  res.json({
    office: {
      id: provider._id,
      officeName: provider.officeName,
      sector: provider.sector,
      address: provider.address,
      location: provider.location,
      isAcceptingJoins: provider.isAcceptingJoins,
      requiredDocuments: provider.requiredDocuments,
    },
    services,
  });
});

// @desc  Join the queue - creates a ticket, no account needed
// @route POST /api/public/offices/:slug/tickets
export const joinQueue = asyncHandler(async (req, res) => {
  const provider = await getProviderBySlug(req.params.slug);

  if (!provider.isAcceptingJoins) {
    res.status(423);
    throw new Error('This office has paused new joins right now');
  }

  const { serviceId, priority, documents, phone, notifyBrowser, notifySms, pushSubscription } = req.body;

  const service = await Service.findOne({ _id: serviceId, provider: provider._id });
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }

  if (notifySms && !phone) {
    res.status(400);
    throw new Error('Phone number is required to send SMS reminders');
  }

  const { token, sequence } = await nextToken(provider._id, service.prefix);

  const ticket = await Ticket.create({
    provider: provider._id,
    service: service._id,
    token,
    sequence,
    priority: !!priority,
    isEmergency: service.isEmergency,
    documents: documents || [],
    phone: phone || '',
    notifyBrowser: !!notifyBrowser,
    notifySms: !!notifySms,
    pushSubscription: pushSubscription || null,
  });

  const { ahead } = await getPositionInfo(ticket);
  const estimate = estimateWaitRange(ahead, service.avgMinutes);

  if (notifySms && phone) {
    await sendSms(phone, `NoQ: You joined ${provider.officeName} for ${service.name}. Your token is ${token}, ~${ahead} ahead.`);
  }

  const snapshot = await buildDashboardSnapshot(provider._id);
  emitQueueUpdate(provider._id, snapshot);

  res.status(201).json({
    ticket,
    office: { officeName: provider.officeName, address: provider.address, location: provider.location },
    position: { ahead },
    estimate,
  });
});

// @desc  Live ticket status - position, estimate, counter (used by TicketPage; also mirrored over sockets)
// @route GET /api/public/tickets/:id
export const getTicketStatus = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id).populate('service').populate('counter');
  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }

  const provider = await Provider.findById(ticket.provider);
  const { ahead } = await getPositionInfo(ticket);
  const estimate = estimateWaitRange(ahead, ticket.service?.avgMinutes || 5);

  // "Now serving" = whatever the office's counters are actively serving right now
  const nowServing = await Ticket.find({ provider: ticket.provider, status: 'serving' }).select('token');

  res.json({
    ticket,
    office: { officeName: provider.officeName, address: provider.address, location: provider.location },
    position: { ahead },
    estimate,
    nowServing: nowServing.map((t) => t.token),
  });
});

// @desc  "Hold my place" - visitor is briefly away; keeps position but flags it
// @route PATCH /api/public/tickets/:id/hold
export const holdPlace = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }
  ticket.heldAt = new Date();
  await ticket.save();
  emitTicketUpdate(ticket.provider, ticket);
  res.json({ ticket });
});

// @desc  Visitor leaves the queue voluntarily
// @route PATCH /api/public/tickets/:id/leave
export const leaveQueue = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }
  ticket.status = 'left';
  ticket.leftAt = new Date();
  await ticket.save();

  const snapshot = await buildDashboardSnapshot(ticket.provider);
  emitQueueUpdate(ticket.provider, snapshot);

  res.json({ ticket });
});

// @desc  Visitor's phone periodically posts its location for the "leave by" ETA
// @route PATCH /api/public/tickets/:id/location
export const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }
  ticket.consumerLocation = { lat, lng, updatedAt: new Date() };
  await ticket.save();
  res.json({ ok: true });
});

// @desc  Data for the office's public waiting-room screen (DisplayPage)
// @route GET /api/public/offices/:slug/display
export const getDisplayBoard = asyncHandler(async (req, res) => {
  const provider = await getProviderBySlug(req.params.slug);

  const counters = await Counter.find({ provider: provider._id, isActive: true })
    .populate('currentTicket')
    .populate('compatibleServices');

  const waiting = await Ticket.find({ provider: provider._id, status: 'waiting' })
    .sort({ isEmergency: -1, priority: -1, createdAt: 1 })
    .limit(5)
    .select('token');

  const servingCount = await Ticket.countDocuments({ provider: provider._id, status: { $in: ['called', 'serving'] } });
  const waitingCount = await Ticket.countDocuments({ provider: provider._id, status: 'waiting' });

  res.json({
    office: { id: provider._id, officeName: provider.officeName, sector: provider.sector },
    counters,
    nextUp: waiting.map((t) => t.token),
    servingCount,
    waitingCount,
  });
});
