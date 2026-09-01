// Centralized API Base URL helper for FleetCMD
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')
    ? 'https://fleetcmd.onrender.com'
    : 'http://localhost:3001');

