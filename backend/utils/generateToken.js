import jwt from 'jsonwebtoken';

const generateToken = (provider) =>
  jwt.sign({ id: provider._id, version: provider.tokenVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export default generateToken;
