import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import Provider from '../models/Provider.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.provider = await Provider.findById(decoded.id).select('+tokenVersion');
    if (!req.provider) {
      res.status(401);
      throw new Error('Provider account no longer exists');
    }
    if ((decoded.version || 0) !== (req.provider.tokenVersion || 0)) {
      res.status(401);
      throw new Error('Session is no longer valid');
    }
    next();
  } catch (err) {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }
});
