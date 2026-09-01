// Centralized API Base URL helper for FleetCMD
export const API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')
    ? '/api/backend'
    : 'http://localhost:3001';



