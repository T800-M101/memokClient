export function transformToFrontendFormat(data) {
  const headers = data.headers || {};

  // 1. Extract Auth securely
  const authHeader = headers['Authorization'] || headers['authorization'] || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';

  // 2. Process Body
  let bodyContent = data.data || '';
  let isJson = false;
  try {
    if (typeof bodyContent === 'string') {
      const parsed = JSON.parse(bodyContent);
      bodyContent = parsed;
      isJson = true;
    } else if (typeof bodyContent === 'object') {
      isJson = true;
    }
  } catch { isJson = false; }

  return {
    method: data.method?.toUpperCase() || 'GET',
    name: data.name || 'Imported Request',
    url: data.url || '',
    // 3. Convert to an array so that Angular's FormArray can understand it
    params: [],
    headers: Object.entries(headers).map(([key, value]) => ({
      key,
      value: String(value), // We ensure it is a string
      description: ''
    })),
    body: {
      type: isJson ? 'json' : (bodyContent ? 'raw' : 'none'),
      jsonContent: isJson ? JSON.stringify(bodyContent, null, 2) : String(bodyContent)
    },
    auth: {
      type: bearerToken ? 'bearer' : (data.auth ? 'basic' : 'none'),
      bearerToken: bearerToken,
      basicUsername: data.auth?.username || '',
      basicPassword: data.auth?.password || ''
    }
  };
}
