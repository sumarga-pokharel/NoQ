import asyncHandler from 'express-async-handler';
import Service from '../models/Service.js';
import { SECTOR_VALUES } from '../models/Provider.js';

// @desc  Update office profile (name, address, location, accepting-joins toggle)
// @route PUT /api/provider/me
// @access Private
export const updateProfile = asyncHandler(async (req, res) => {
  const { officeName, address, location, phone, isAcceptingJoins } = req.body;

  if (officeName) req.provider.officeName = officeName;
  if (address !== undefined) req.provider.address = address;
  if (location) req.provider.location = location;
  if (phone !== undefined) req.provider.phone = phone;
  if (isAcceptingJoins !== undefined) req.provider.isAcceptingJoins = isAcceptingJoins;

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
    throw new Error(`Sector must be one of: ${SECTOR_VALUES.join(', ')}`);
  }

  if (sector) req.provider.sector = sector;
  if (Array.isArray(requiredDocuments)) {
    req.provider.requiredDocuments = requiredDocuments.map((d) =>
      typeof d === 'string' ? { name: d, required: true } : d
    );
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
  res.json({ provider: req.provider.toPublicJSON(), services: finalServices });
});

// @desc  Replace the required-documents list
// @route PUT /api/provider/documents
// @access Private
export const updateDocuments = asyncHandler(async (req, res) => {
  const { requiredDocuments } = req.body;
  if (!Array.isArray(requiredDocuments)) {
    res.status(400);
    throw new Error('requiredDocuments must be an array');
  }
  req.provider.requiredDocuments = requiredDocuments.map((d) =>
    typeof d === 'string' ? { name: d, required: true } : d
  );
  await req.provider.save();
  res.json({ requiredDocuments: req.provider.requiredDocuments });
});
