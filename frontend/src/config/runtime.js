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
