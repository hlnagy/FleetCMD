// Centralized API Base URL helper for FleetCMD
export const API_BASE_URL =
  typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || window.location.hostname !== 'localhost')
    ? 'https://fleetcmd.onrender.com'
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');


