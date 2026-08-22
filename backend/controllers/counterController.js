import asyncHandler from 'express-async-handler';
import Counter from '../models/Counter.js';
import Ticket from '../models/Ticket.js';
import Service from '../models/Service.js';
import { emitQueueUpdate, emitTicketUpdate } from '../sockets/index.js';
import { buildDashboardSnapshot } from './ticketController.js';
import { notifyNearbyTickets, sendCalledSms } from '../utils/queueSms.js';

const validateCompatibleServices = async (providerId, serviceIds = []) => {
  if (!Array.isArray(serviceIds)) {
    const error = new Error('compatibleServices must be an array');
    error.status = 400;
    error.fields = { compatibleServices: error.message };
    throw error;
  }
  const uniqueIds = [...new Set(serviceIds.map(String))];
  const count = await Service.countDocuments({ _id: { $in: uniqueIds }, provider: providerId });
  if (count !== uniqueIds.length) {
    const error = new Error('One or more compatible services are invalid');
    error.status = 400;
    error.fields = { compatibleServices: error.message };
    throw error;
  }
  return uniqueIds;
};

// @route GET /api/counters
export const listCounters = asyncHandler(async (req, res) => {
  const counters = await Counter.find({ provider: req.provider._id })
    .populate('currentTicket')
    .populate('compatibleServices');
  res.json({ counters });
});

// @route POST /api/counters
export const createCounter = asyncHandler(async (req, res) => {
  const { name, compatibleServices, isActive } = req.body;
  if (!name?.trim()) {
    res.status(400);
    const error = new Error('Counter name is required');
    error.fields = { name: error.message };
    throw error;
  }
  const serviceIds = await validateCompatibleServices(req.provider._id, compatibleServices || []);
  const counter = await Counter.create({
    provider: req.provider._id,
    name: name.trim(),
    compatibleServices: serviceIds,
    isActive: isActive !== false,
  });
  emitQueueUpdate(req.provider._id);
  res.status(201).json({ counter });
});

// @route PUT /api/counters/:id
export const updateCounter = asyncHandler(async (req, res) => {
  const counter = await Counter.findOne({ _id: req.params.id, provider: req.provider._id });
  if (!counter) {
    res.status(404);
    throw new Error('Counter not found');
  }
  if (req.body.name !== undefined) {
    if (!String(req.body.name).trim()) {
      res.status(400);
      const error = new Error('Counter name is required');
      error.fields = { name: error.message };
      throw error;
    }
    counter.name = String(req.body.name).trim();
  }
  if (req.body.isActive !== undefined) counter.isActive = req.body.isActive;
  if (req.body.compatibleServices !== undefined) {
    counter.compatibleServices = await validateCompatibleServices(req.provider._id, req.body.compatibleServices);
  }
  await counter.save();
  emitQueueUpdate(req.provider._id);
  res.json({ counter });
});

// @route DELETE /api/counters/:id
export const deleteCounter = asyncHandler(async (req, res) => {
  const counter = await Counter.findOne({ _id: req.params.id, provider: req.provider._id });
  if (!counter) {
    res.status(404);
    throw new Error('Counter not found');
  }
  if (counter.currentTicket) {
    res.status(409);
    throw new Error('Finish or skip the current ticket before deleting this counter');
  }
  await counter.deleteOne();
  emitQueueUpdate(req.provider._id);
  res.json({ message: 'Counter removed' });
});

// @desc  Call the next compatible waiting ticket to this counter
// @route POST /api/counters/:id/call-next
export const callNext = asyncHandler(async (req, res) => {
  const counter = await Counter.findOne({ _id: req.params.id, provider: req.provider._id });
  if (!counter) {
    res.status(404);
    throw new Error('Counter not found');
  }
  if (!counter.isActive) {
    res.status(409);
    throw new Error('Activate this counter before calling the next ticket');
  }

  if (counter.currentTicket) {
    res.status(409);
    throw new Error('Complete or skip the current ticket before calling another');
  }

  const query = {
    provider: req.provider._id,
    status: 'waiting',
    ...(counter.compatibleServices?.length ? { service: { $in: counter.compatibleServices } } : {}),
  };

  // Emergency first, then priority, then FIFO
  const next = await Ticket.findOne(query).sort({ isEmergency: -1, priority: -1, createdAt: 1 });

  if (!next) {
    counter.status = 'idle';
    counter.currentTicket = null;
    await counter.save();
    res.json({ counter, ticket: null, message: 'No compatible tickets waiting' });
    return;
  }

  next.status = 'called';
  next.calledAt = new Date();
  next.counter = counter._id;
  await next.save();

  counter.status = 'waiting'; // waiting on the visitor to arrive/approach
  counter.currentTicket = next._id;
  await counter.save();

  const snapshot = await buildDashboardSnapshot(req.provider._id);
  emitQueueUpdate(req.provider._id, snapshot);
  emitTicketUpdate(req.provider._id, next);
  void Promise.all([sendCalledSms(next), notifyNearbyTickets(req.provider._id)]).catch((error) =>
    console.error('Queue SMS update failed:', error.message)
  );

  res.json({ counter, ticket: next });
});

// @desc  Confirm that the called visitor has arrived and begin service
// @route POST /api/counters/:id/arrived
export const markArrived = asyncHandler(async (req, res) => {
  const counter = await Counter.findOne({ _id: req.params.id, provider: req.provider._id });
  if (!counter) {
    res.status(404);
    throw new Error('Counter not found');
  }
  if (!counter.currentTicket) {
    res.status(409);
    throw new Error('This counter has no called visitor');
  }

  const ticket = await Ticket.findOne({
    _id: counter.currentTicket,
    provider: req.provider._id,
    counter: counter._id,
  });
  if (!ticket || ticket.status !== 'called') {
    res.status(409);
    throw new Error('Only a called ticket can be marked as arrived');
  }

  ticket.status = 'serving';
  ticket.servedAt = new Date();
  await ticket.save();
  counter.status = 'serving';
  await counter.save();

  const snapshot = await buildDashboardSnapshot(req.provider._id);
  emitQueueUpdate(req.provider._id, snapshot);
  emitTicketUpdate(req.provider._id, ticket);
  res.json({ counter, ticket });
});

// @desc  Complete service for the visitor currently at this counter
// @route POST /api/counters/:id/complete
export const completeTicket = asyncHandler(async (req, res) => {
  const counter = await Counter.findOne({ _id: req.params.id, provider: req.provider._id });
  if (!counter) {
    res.status(404);
    throw new Error('Counter not found');
  }
  if (!counter.currentTicket) {
    res.status(409);
    throw new Error('This counter has no ticket to complete');
  }

  const ticket = await Ticket.findOne({
    _id: counter.currentTicket,
    provider: req.provider._id,
    counter: counter._id,
  });
  if (!ticket || ticket.status !== 'serving') {
    res.status(409);
    throw new Error('Mark the visitor as arrived before completing the ticket');
  }

  ticket.status = 'done';
  ticket.completedAt = new Date();
  await ticket.save();
  counter.status = 'idle';
  counter.currentTicket = null;
  await counter.save();

  const snapshot = await buildDashboardSnapshot(req.provider._id);
  emitQueueUpdate(req.provider._id, snapshot);
  emitTicketUpdate(req.provider._id, ticket);
  void notifyNearbyTickets(req.provider._id).catch((error) => console.error('Nearby SMS update failed:', error.message));
  res.json({ counter, ticket });
});

// @desc  Mark the counter's current ticket as a no-show and free the counter
// @route POST /api/counters/:id/skip
export const skip = asyncHandler(async (req, res) => {
  const counter = await Counter.findOne({ _id: req.params.id, provider: req.provider._id });
  if (!counter) {
    res.status(404);
    throw new Error('Counter not found');
  }

  if (!counter.currentTicket) {
    res.status(409);
    throw new Error('This counter has no called visitor to skip');
  }

  const ticket = await Ticket.findOne({ _id: counter.currentTicket, provider: req.provider._id });
  if (!ticket || ticket.status !== 'called') {
    res.status(409);
    throw new Error('Only a called visitor can be marked as a no-show');
  }
  ticket.status = 'no-show';
  await ticket.save();

  counter.status = 'idle';
  counter.currentTicket = null;
  await counter.save();

  const snapshot = await buildDashboardSnapshot(req.provider._id);
  emitQueueUpdate(req.provider._id, snapshot);
  emitTicketUpdate(req.provider._id, ticket);
  void notifyNearbyTickets(req.provider._id).catch((error) => console.error('Nearby SMS update failed:', error.message));

  res.json({ counter, ticket });
});
