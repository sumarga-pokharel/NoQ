import asyncHandler from 'express-async-handler';
import Provider, { SECTOR_VALUES } from '../models/Provider.js';
import Service from '../models/Service.js';
import Ticket from '../models/Ticket.js';
import Counter from '../models/Counter.js';
import { nextToken, getPositionInfo, estimateWaitRange } from '../utils/queueEstimator.js';
import { emitQueueUpdate, emitTicketUpdate } from '../sockets/index.js';
import { buildDashboardSnapshot } from './ticketController.js';
import { normalizePhone, sendSms } from '../utils/sms.js';
import { notifyNearbyTickets } from '../utils/queueSms.js';
import { buildLeaveByEstimate, refreshTravelEstimate } from '../utils/travelEstimator.js';

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
    const error = new Error('Select a valid service');
    error.fields = { serviceId: error.message };
    throw error;
  }

  if (notifySms && !phone) {
    res.status(400);
    const error = new Error('Phone number is required to send SMS reminders');
    error.fields = { phone: error.message };
    throw error;
  }
  const normalizedPhone = notifySms ? normalizePhone(phone) : '';

  const { token, sequence } = await nextToken(provider._id, service.prefix);

  const ticket = await Ticket.create({
    provider: provider._id,
    service: service._id,
    token,
    sequence,
    priority: !!priority,
    isEmergency: service.isEmergency,
    documents: documents || [],
    phone: normalizedPhone,
    notifyBrowser: !!notifyBrowser,
    notifySms: !!notifySms,
    pushSubscription: pushSubscription || null,
  });

  const { ahead } = await getPositionInfo(ticket);
  const estimate = estimateWaitRange(ahead, service.avgMinutes);

  if (notifySms && normalizedPhone) {
    const sms = await sendSms(normalizedPhone, `NoQ: You joined ${provider.officeName} for ${service.name}. Your token is ${token}, ${ahead} ahead. Estimated wait: ${estimate.min}-${estimate.max} min.`);
    if (sms.delivered || sms.simulated) {
      ticket.smsJoinSentAt = new Date();
      if (ahead <= 3) ticket.smsNearSentAt = new Date();
      await ticket.save();
    }
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
  const travel = buildLeaveByEstimate(ticket.travelEstimate, estimate, ticket.status);

  // "Now serving" = whatever the office's counters are actively serving right now
  const nowServing = await Ticket.find({ provider: ticket.provider, status: 'serving' }).select('token');

  res.json({
    ticket,
    office: { officeName: provider.officeName, address: provider.address, location: provider.location },
    position: { ahead },
    estimate,
    travel,
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
  void notifyNearbyTickets(ticket.provider).catch((error) => console.error('Nearby SMS update failed:', error.message));

  res.json({ ticket });
});

// @desc  Visitor's phone periodically posts its location for the "leave by" ETA
// @route PATCH /api/public/tickets/:id/location
export const updateLocation = asyncHandler(async (req, res) => {
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  const accuracy = req.body.accuracy === undefined ? undefined : Number(req.body.accuracy);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    res.status(400);
    throw new Error('Valid latitude and longitude are required');
  }
  if (accuracy !== undefined && (!Number.isFinite(accuracy) || accuracy < 0)) {
    res.status(400);
    throw new Error('Location accuracy must be a positive number');
  }
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }
  if (['done', 'no-show', 'left'].includes(ticket.status)) {
    res.status(409);
    throw new Error('Location updates are closed for this ticket');
  }
  ticket.consumerLocation = { lat, lng, accuracy, updatedAt: new Date() };
  await ticket.save();
  const provider = await Provider.findById(ticket.provider).select('location');
  const route = await refreshTravelEstimate(ticket, provider);
  const { ahead } = await getPositionInfo(ticket);
  const service = await Service.findById(ticket.service).select('avgMinutes');
  const queueEstimate = estimateWaitRange(ahead, service?.avgMinutes || 5);
  res.json({ ok: true, travel: buildLeaveByEstimate(route, queueEstimate, ticket.status) });
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

// @desc  Public directory: offices grouped by sector, with their bookable services
// @route GET /api/public/directory?sector=hospital
export const getDirectory = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.sector) filter.sector = req.query.sector;

  const providers = await Provider.find(filter).select(
    'officeName slug sector address location isAcceptingJoins requiredDocuments'
  );

  const services = await Service.find({
    provider: { $in: providers.map((p) => p._id) },
    isActive: true,
  }).select('provider name category avgMinutes prefix isEmergency');

  const byProvider = new Map();
  services.forEach((service) => {
    const key = String(service.provider);
    if (!byProvider.has(key)) byProvider.set(key, []);
    byProvider.get(key).push(service);
  });

  const offices = providers.map((provider) => ({
    id: provider._id,
    officeName: provider.officeName,
    slug: provider.slug,
    sector: provider.sector,
    address: provider.address,
    location: provider.location,
    isAcceptingJoins: provider.isAcceptingJoins,
    requiredDocuments: provider.requiredDocuments,
    services: byProvider.get(String(provider._id)) || [],
  }));

  res.json({
    sectors: SECTOR_VALUES.map((sector) => ({
      sector,
      officeCount: offices.filter((o) => o.sector === sector).length,
    })),
    offices,
  });
});
