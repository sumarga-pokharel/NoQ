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
    req.provider = await Provider.findById(decoded.id);
    if (!req.provider) {
      res.status(401);
      throw new Error('Provider account no longer exists');
    }
    next();
  } catch (err) {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }
});
