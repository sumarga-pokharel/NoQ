import asyncHandler from 'express-async-handler';
import Provider from '../models/Provider.js';
import generateToken from '../utils/generateToken.js';
import { uniqueSlug } from '../utils/slugify.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/email.js';
import { primaryClientOrigin } from '../config/env.js';

const validateNewPassword = (password, field = 'password') => {
  if (typeof password !== 'string' || password.length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.status = 400;
    error.fields = { [field]: error.message };
    throw error;
  }
};

// @desc  Register a new office/provider account
// @route POST /api/auth/signup
// @access Public
export const signup = asyncHandler(async (req, res) => {
  const { officeName, sector, email, phone, password } = req.body;

  if (!officeName || !email || !password) {
    res.status(400);
    const error = new Error('Complete the required account fields');
    error.fields = {
      ...(!officeName ? { officeName: 'Office name is required' } : {}),
      ...(!email ? { email: 'Email is required' } : {}),
      ...(!password ? { password: 'Password is required' } : {}),
    };
    throw error;
  }

  const exists = await Provider.findOne({ email: email.toLowerCase() });
  if (exists) {
    res.status(409);
    const error = new Error('An account with this email already exists');
    error.fields = { email: error.message };
    throw error;
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
    token: generateToken(provider),
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
    const error = new Error('Email and password are required');
    error.fields = { ...(!email ? { email: 'Email is required' } : {}), ...(!password ? { password: 'Password is required' } : {}) };
    throw error;
  }

  const provider = await Provider.findOne({ email: email.toLowerCase() }).select('+password +tokenVersion');
  if (!provider || !(await provider.comparePassword(password))) {
    res.status(401);
    const error = new Error('Invalid email or password');
    error.fields = { email: 'Check your email and password' };
    throw error;
  }

  res.json({
    token: generateToken(provider),
    provider: provider.toPublicJSON(),
  });
});

// @desc  Get the logged-in provider's profile
// @route GET /api/auth/me
// @access Private
export const getMe = asyncHandler(async (req, res) => {
  res.json({ provider: req.provider.toPublicJSON() });
});

// @route POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) {
    res.status(400);
    const error = new Error('Email is required');
    error.fields = { email: error.message };
    throw error;
  }
  const genericMessage = 'If an account exists for that email, a password-reset link has been sent.';
  const provider = email ? await Provider.findOne({ email }).select('+resetPasswordToken +resetPasswordExpires') : null;
  if (!provider) return res.json({ message: genericMessage });

  const rawToken = crypto.randomBytes(32).toString('hex');
  provider.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  provider.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
  await provider.save({ validateBeforeSave: false });
  const resetUrl = `${primaryClientOrigin}/reset-password/${rawToken}`;

  try {
    const delivered = await sendPasswordResetEmail({ email: provider.email, officeName: provider.officeName, resetUrl });
    if (!delivered && process.env.NODE_ENV === 'production') {
      res.status(503);
      throw new Error('Password-reset email is temporarily unavailable');
    }
    res.json({ message: genericMessage, ...(delivered || process.env.NODE_ENV === 'production' ? {} : { resetUrl }) });
  } catch (error) {
    provider.resetPasswordToken = undefined;
    provider.resetPasswordExpires = undefined;
    await provider.save({ validateBeforeSave: false });
    throw error;
  }
});

// @route POST /api/auth/reset-password/:token
export const resetPassword = asyncHandler(async (req, res) => {
  validateNewPassword(req.body.password, 'password');
  const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const provider = await Provider.findOne({
    resetPasswordToken: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+password +tokenVersion +resetPasswordToken +resetPasswordExpires');
  if (!provider) {
    res.status(400);
    const error = new Error('This password-reset link is invalid or has expired');
    error.fields = { password: 'Request a new reset link before trying again' };
    throw error;
  }
  provider.password = req.body.password;
  provider.tokenVersion += 1;
  provider.resetPasswordToken = undefined;
  provider.resetPasswordExpires = undefined;
  await provider.save();
  res.json({ message: 'Password reset successfully. You can now log in.' });
});

// @route PATCH /api/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  validateNewPassword(newPassword, 'newPassword');
  const provider = await Provider.findById(req.provider._id).select('+password +tokenVersion');
  if (!currentPassword || !(await provider.comparePassword(currentPassword))) {
    res.status(400);
    const error = new Error('Current password is incorrect');
    error.fields = { currentPassword: error.message };
    throw error;
  }
  if (await provider.comparePassword(newPassword)) {
    res.status(400);
    const error = new Error('New password must be different from the current password');
    error.fields = { newPassword: error.message };
    throw error;
  }
  provider.password = newPassword;
  provider.tokenVersion += 1;
  await provider.save();
  res.json({ message: 'Password changed successfully', token: generateToken(provider) });
});
