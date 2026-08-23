const validateEndpoint = (value, name, { relative = true } = {}) => {
  const endpoint = value?.trim();
  if (!endpoint) return '';
  if (relative && endpoint.startsWith('/')) return endpoint.replace(/\/$/, '');
  try {
    const url = new URL(endpoint);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url.href.replace(/\/$/, '');
  } catch { throw new Error(`${name} must be an HTTP(S) URL${relative ? ' or a root-relative path' : ''}`); }
};

export const API_URL = validateEndpoint(import.meta.env.VITE_API_URL || '/api', 'VITE_API_URL');
export const SOCKET_URL = validateEndpoint(import.meta.env.VITE_SOCKET_URL || window.location.origin, 'VITE_SOCKET_URL', { relative: false });
export const SOCKET_PATH = (import.meta.env.VITE_SOCKET_PATH || '/socket.io').trim();

// Base URL baked into visitor-facing QR codes and join links (Dashboard,
// Setup, Display). Defaults to wherever the page itself was loaded from —
// correct in production, but on a LAN-testing laptop that's often
// http://localhost:5173, which a phone scanning the code can't resolve to
// itself. Set VITE_PUBLIC_URL to the laptop's LAN address (or a tunnel
// URL) to keep QR codes scannable regardless of which host staff happen to
// view the dashboard from.
export const PUBLIC_URL = validateEndpoint(import.meta.env.VITE_PUBLIC_URL || window.location.origin, 'VITE_PUBLIC_URL', { relative: false });
