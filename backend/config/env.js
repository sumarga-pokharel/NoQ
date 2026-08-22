import 'dotenv/config';

const cleanOrigin = (value) => {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Unsupported CLIENT_ORIGIN protocol: ${url.protocol}`);
  return url.origin;
};

export const isProduction = process.env.NODE_ENV === 'production';
export const port = Number(process.env.PORT || 5000);
export const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').filter(Boolean).map(cleanOrigin);
export const primaryClientOrigin = clientOrigins[0];
export const socketPath = process.env.SOCKET_PATH || '/socket.io';
export const trustProxy = process.env.TRUST_PROXY === undefined ? (isProduction ? 1 : false) : Number(process.env.TRUST_PROXY) || false;

export function validateEnvironment() {
  const missing = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_ORIGIN'].filter((name) => !process.env[name]);
  if (isProduction && missing.length) throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  if (isProduction && String(process.env.JWT_SECRET || '').length < 32) throw new Error('JWT_SECRET must be at least 32 characters in production');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');
}
