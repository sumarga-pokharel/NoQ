import asyncHandler from 'express-async-handler';
import Service from '../models/Service.js';
import { SECTOR_VALUES } from '../models/Provider.js';
import { emitQueueUpdate } from '../sockets/index.js';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const normalizeDocuments = (documents) => {
  if (!Array.isArray(documents)) {
    const error = new Error('requiredDocuments must be an array');
    error.status = 400;
    error.fields = { requiredDocuments: error.message };
    throw error;
  }
  const seen = new Set();
  return documents.map((document) => {
    const name = String(typeof document === 'string' ? document : document?.name || '').trim();
    if (!name || name.length > 120) {
      const error = new Error('Every document needs a name between 1 and 120 characters');
      error.status = 400;
      error.fields = { requiredDocuments: error.message };
      throw error;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      const error = new Error(`Duplicate document: ${name}`);
      error.status = 409;
      error.fields = { requiredDocuments: error.message };
      throw error;
    }
    seen.add(key);
    return { name, required: typeof document === 'string' ? true : document.required !== false };
  });
};

// @desc  Update office profile (name, address, location, accepting-joins toggle)
// @route PUT /api/provider/me
// @access Private
export const updateProfile = asyncHandler(async (req, res) => {
  const { officeName, address, location, phone, isAcceptingJoins, openTime, closeTime } = req.body;

  if (officeName !== undefined) {
    const name = String(officeName).trim();
    if (name.length < 2 || name.length > 120) {
      res.status(400);
      const error = new Error('Office name must be between 2 and 120 characters');
      error.fields = { officeName: error.message };
      throw error;
    }
    req.provider.officeName = name;
  }
  if (address !== undefined) {
    const cleanAddress = String(address || '').trim();
    if (cleanAddress.length > 240) {
      res.status(400);
      const error = new Error('Address cannot exceed 240 characters');
      error.fields = { address: error.message };
      throw error;
    }
    req.provider.address = cleanAddress;
  }
  if (location !== undefined) {
    if (location === null) {
      req.provider.location = undefined;
    } else {
      const lat = Number(location.lat);
      const lng = Number(location.lng);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
        res.status(400);
        const error = new Error('Valid office latitude and longitude are required');
        error.fields = { location: error.message };
        throw error;
      }
      req.provider.location = { lat, lng };
    }
  }
  if (phone !== undefined) {
    const cleanPhone = String(phone || '').trim();
    if (cleanPhone.length > 30 || (cleanPhone && !/^\+?[0-9\s()-]{7,30}$/.test(cleanPhone))) {
      res.status(400);
      const error = new Error('Enter a valid office phone number');
      error.fields = { phone: error.message };
      throw error;
    }
    req.provider.phone = cleanPhone;
  }
  if (isAcceptingJoins !== undefined) req.provider.isAcceptingJoins = isAcceptingJoins;

  if (openTime !== undefined || closeTime !== undefined) {
    const nextOpen = openTime !== undefined ? String(openTime).trim() : req.provider.openTime || '10:00';
    const nextClose = closeTime !== undefined ? String(closeTime).trim() : req.provider.closeTime || '17:00';
    if (!TIME_RE.test(nextOpen) || !TIME_RE.test(nextClose)) {
      res.status(400);
      const error = new Error('Office hours must be in 24h HH:MM format');
      error.fields = { openTime: error.message };
      throw error;
    }
    if (toMinutes(nextClose) <= toMinutes(nextOpen)) {
      res.status(400);
      const error = new Error('Closing time must be after opening time');
      error.fields = { closeTime: error.message };
      throw error;
    }
    req.provider.openTime = nextOpen;
    req.provider.closeTime = nextClose;
  }

  await req.provider.save();
  res.json({ provider: req.provider.toPublicJSON() });
});

// @desc  Run the Setup wizard: sector, services and required documents in one save
// @route PUT /api/provider/setup
// @access Private
export const runSetup = asyncHandler(async (req, res) => {
  const { sector, services, requiredDocuments } = req.body;

  if (sector && !SECTOR_VALUES.includes(sector)) {
    res.status(400);
    const error = new Error(`Sector must be one of: ${SECTOR_VALUES.join(', ')}`);
    error.fields = { sector: error.message };
    throw error;
  }

  if (sector) req.provider.sector = sector;
  if (Array.isArray(requiredDocuments)) {
    req.provider.requiredDocuments = normalizeDocuments(requiredDocuments);
  }
  req.provider.onboardingComplete = true;
  await req.provider.save();

  // Replace the service list with whatever was configured in the wizard
  if (Array.isArray(services)) {
    await Service.deleteMany({ provider: req.provider._id });
    const docs = services
      .filter((s) => s.name)
      .map((s) => ({
        provider: req.provider._id,
        name: s.name,
        category: s.category || '',
        avgMinutes: Number(s.minutes || s.avgMinutes) || 5,
        prefix: (s.prefix || s.name[0] || 'S').toString().toUpperCase().slice(0, 1),
        isEmergency: !!s.isEmergency,
      }));
    if (docs.length) await Service.insertMany(docs);
  }

  const finalServices = await Service.find({ provider: req.provider._id });
  emitQueueUpdate(req.provider._id);
  res.json({ provider: req.provider.toPublicJSON(), services: finalServices });
});

// @desc  Replace the required-documents list
// @route PUT /api/provider/documents
// @access Private
export const updateDocuments = asyncHandler(async (req, res) => {
  const { requiredDocuments } = req.body;
  req.provider.requiredDocuments = normalizeDocuments(requiredDocuments);
  await req.provider.save();
  emitQueueUpdate(req.provider._id);
  emitQueueUpdate(req.provider._id);
  res.json({ requiredDocuments: req.provider.requiredDocuments });
});
