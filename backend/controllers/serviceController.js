import asyncHandler from 'express-async-handler';
import Service from '../models/Service.js';

// @route GET /api/services
export const listServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ provider: req.provider._id }).sort({ createdAt: 1 });
  res.json({ services });
});

// @route POST /api/services
export const createService = asyncHandler(async (req, res) => {
  const { name, category, avgMinutes, prefix, isEmergency } = req.body;
  if (!name) {
    res.status(400);
    throw new Error('Service name is required');
  }
  const service = await Service.create({
    provider: req.provider._id,
    name,
    category,
    avgMinutes: avgMinutes || 5,
    prefix: (prefix || name[0] || 'S').toUpperCase().slice(0, 1),
    isEmergency: !!isEmergency,
  });
  res.status(201).json({ service });
});

// @route PUT /api/services/:id
export const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findOne({ _id: req.params.id, provider: req.provider._id });
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }
  ['name', 'category', 'avgMinutes', 'prefix', 'isEmergency', 'isActive'].forEach((key) => {
    if (req.body[key] !== undefined) service[key] = req.body[key];
  });
  await service.save();
  res.json({ service });
});

// @route DELETE /api/services/:id
export const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findOneAndDelete({ _id: req.params.id, provider: req.provider._id });
  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }
  res.json({ message: 'Service removed' });
});
