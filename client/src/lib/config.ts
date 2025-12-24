import { Capacitor } from '@capacitor/core';

/**
 * Get the base URL for API requests
 * - In native production: points to Render server
 * - In native development: points to localhost via emulator
 * - In web: uses relative paths
 */
export const getBaseUrl = () => {
  if (Capacitor.isNativePlatform()) {
    // If in native development, point to the host machine via the emulator's special IP
    if (import.meta.env.DEV) {
      return 'http://10.0.2.2:5000';
    }
    // For native production builds, point to the live server
    return 'https://monitorcommunicator.onrender.com';
  }
  // For web, check hostname at runtime to be absolutely sure
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '';
  }

  // For production web (Vercel), point directly to Render
  return 'https://monitorcommunicator.onrender.com';
};

export const API_BASE_URL = getBaseUrl();
