const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export async function api(path, { token, body, headers, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(payload?.message || 'The NoQ API request failed', response.status)
  return payload
}
