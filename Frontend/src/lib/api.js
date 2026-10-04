const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
let csrfToken = '';

async function request(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { ...options.headers };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers['X-CSRF-Token'] = csrfToken;

  let response;
  try {
    response = await fetch(`${backendUrl}${path}`, {
      ...options,
      method,
      headers,
      credentials: 'include',
    });
  } catch (error) {
    throw new Error(`No se pudo conectar con el backend local: ${error.message}`);
  }

  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación.');
  if (result.csrfToken) csrfToken = result.csrfToken;
  return result;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
};

export const setCsrfToken = (token) => {
  csrfToken = token;
};
