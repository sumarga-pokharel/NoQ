import jwt from 'jsonwebtoken';

const generateToken = (providerId) =>
  jwt.sign({ id: providerId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export default generateToken;
