import asyncHandler from 'express-async-handler';
import Counter from '../models/Counter.js';
import Ticket from '../models/Ticket.js';
import { emitQueueUpdate, emitTicketUpdate } from '../sockets/index.js';
import { buildDashboardSnapshot } from './ticketController.js';

// @route GET /api/counters
export const listCounters = asyncHandler(async (req, res) => {
  const counters = await Counter.find({ provider: req.provider._id })
    .populate('currentTicket')
    .populate('compatibleServices');
  res.json({ counters });
});

// @route POST /api/counters
export const createCounter = asyncHandler(async (req, res) => {
  const { name, compatibleServices } = req.body;
  if (!name) {
    res.status(400);
    throw new Error('Counter name is required');
  }
  const counter = await Counter.create({
    provider: req.provider._id,
    name,
    compatibleServices: compatibleServices || [],
  });
  res.status(201).json({ counter });
});

// @route PUT /api/counters/:id
export const updateCounter = asyncHandler(async (req, res) => {
  const counter = await Counter.findOne({ _id: req.params.id, provider: req.provider._id });
  if (!counter) {
    res.status(404);
    throw new Error('Counter not found');
  }
  ['name', 'compatibleServices', 'isActive'].forEach((key) => {
    if (req.body[key] !== undefined) counter[key] = req.body[key];
  });
  await counter.save();
  res.json({ counter });
});

// @route DELETE /api/counters/:id
export const deleteCounter = asyncHandler(async (req, res) => {
  const counter = await Counter.findOneAndDelete({ _id: req.params.id, provider: req.provider._id });
  if (!counter) {
    res.status(404);
    throw new Error('Counter not found');
  }
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

  // Free up whatever this counter was previously serving
  if (counter.currentTicket) {
    await Ticket.findByIdAndUpdate(counter.currentTicket, { status: 'done', completedAt: new Date() });
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

  res.json({ counter, ticket: next });
});

// @desc  Mark the counter's current ticket as a no-show and free the counter
// @route POST /api/counters/:id/skip
export const skip = asyncHandler(async (req, res) => {
  const counter = await Counter.findOne({ _id: req.params.id, provider: req.provider._id });
  if (!counter) {
    res.status(404);
    throw new Error('Counter not found');
  }

  if (counter.currentTicket) {
    await Ticket.findByIdAndUpdate(counter.currentTicket, { status: 'no-show' });
  }

  counter.status = 'idle';
  counter.currentTicket = null;
  await counter.save();

  const snapshot = await buildDashboardSnapshot(req.provider._id);
  emitQueueUpdate(req.provider._id, snapshot);

  res.json({ counter });
});
