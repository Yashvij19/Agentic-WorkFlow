export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
export const WS_URL = API_URL.startsWith('https://')
  ? API_URL.replace(/^https:\/\//, 'wss://')
  : API_URL.replace(/^http:\/\//, 'ws://');
