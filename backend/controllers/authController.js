import asyncHandler from 'express-async-handler';
import Provider from '../models/Provider.js';
import generateToken from '../utils/generateToken.js';
import { uniqueSlug } from '../utils/slugify.js';

// @desc  Register a new office/provider account
// @route POST /api/auth/signup
// @access Public
export const signup = asyncHandler(async (req, res) => {
  const { officeName, sector, email, phone, password } = req.body;

  if (!officeName || !email || !password) {
    res.status(400);
    throw new Error('Office name, email and password are required');
  }

  const exists = await Provider.findOne({ email: email.toLowerCase() });
  if (exists) {
    res.status(409);
    throw new Error('An account with this email already exists');
  }

  const slug = await uniqueSlug(officeName);

  const provider = await Provider.create({
    officeName,
    sector: sector || 'government',
    email,
    phone,
    password,
    slug,
  });

  res.status(201).json({
    token: generateToken(provider._id),
    provider: provider.toPublicJSON(),
  });
});

// @desc  Log in to an office/provider account
// @route POST /api/auth/login
// @access Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const provider = await Provider.findOne({ email: email.toLowerCase() }).select('+password');
  if (!provider || !(await provider.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  res.json({
    token: generateToken(provider._id),
    provider: provider.toPublicJSON(),
  });
});

// @desc  Get the logged-in provider's profile
// @route GET /api/auth/me
// @access Private
export const getMe = asyncHandler(async (req, res) => {
  res.json({ provider: req.provider.toPublicJSON() });
});
