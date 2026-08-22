import asyncHandler from 'express-async-handler';
import Service from '../models/Service.js';
import Ticket from '../models/Ticket.js';
import Counter from '../models/Counter.js';
import { emitQueueUpdate } from '../sockets/index.js';

const serviceInput = (body, partial = false) => {
  const output = {};
  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) {
      const error = new Error('Service name is required');
      error.status = 400;
      error.fields = { name: error.message };
      throw error;
    }
    output.name = name;
  }
  if (!partial || body.avgMinutes !== undefined) {
    const avgMinutes = Number(body.avgMinutes || 5);
    if (!Number.isFinite(avgMinutes) || avgMinutes < 1 || avgMinutes > 480) {
      const error = new Error('Average service time must be between 1 and 480 minutes');
      error.status = 400;
      error.fields = { avgMinutes: error.message };
      throw error;
    }
    output.avgMinutes = avgMinutes;
  }
  if (!partial || body.prefix !== undefined) {
    const prefix = String(body.prefix || body.name?.[0] || 'S').trim().toUpperCase();
    if (!/^[A-Z0-9]{1,3}$/.test(prefix)) {
      const error = new Error('Token prefix must contain 1–3 letters or numbers');
      error.status = 400;
      error.fields = { prefix: error.message };
      throw error;
    }
    output.prefix = prefix;
  }
  if (!partial || body.category !== undefined) output.category = String(body.category || '').trim();
  if (!partial || body.isEmergency !== undefined) output.isEmergency = Boolean(body.isEmergency);
  if (body.isActive !== undefined) output.isActive = Boolean(body.isActive);
  return output;
};

// @route GET /api/services
export const listServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ provider: req.provider._id }).sort({ createdAt: 1 });
  res.json({ services });
});

// @route POST /api/services
export const createService = asyncHandler(async (req, res) => {
  const service = await Service.create({
    provider: req.provider._id,
    ...serviceInput(req.body),
  });
  emitQueueUpdate(req.provider._id);
  res.status(201).json({ service });
});

// @route PUT /api/services/:id
export const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findOne({ _id: req.params.id, provider: req.provider._id });
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }
  Object.assign(service, serviceInput(req.body, true));
  await service.save();
  emitQueueUpdate(req.provider._id);
  res.json({ service });
});

// @route DELETE /api/services/:id
export const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findOne({ _id: req.params.id, provider: req.provider._id });
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }
  if (await Ticket.exists({ service: service._id })) {
    res.status(409);
    throw new Error('This service has ticket history and cannot be deleted; deactivate it instead');
  }
  await Counter.updateMany({ provider: req.provider._id }, { $pull: { compatibleServices: service._id } });
  await service.deleteOne();
  emitQueueUpdate(req.provider._id);
  res.json({ message: 'Service removed' });
});
