// Configuration for different environments
const config = {
  development: {
    API_BASE_URL: 'http://localhost:8000',
  },
  production: {
    API_BASE_URL: import.meta.env.VITE_API_URL || 'https://35lbackend-dev.us-west-2.elasticbeanstalk.com',
  }
};

// Determine current environment
const environment = import.meta.env.MODE || 'development';

// Export the configuration for the current environment
export const API_BASE_URL = import.meta.env.VITE_API_URL || config[environment]?.API_BASE_URL || config.development.API_BASE_URL;

// Generate WebSocket URL from API base URL
export const getWebSocketURL = (path) => {
  const apiUrl = API_BASE_URL;
  const wsProtocol = apiUrl.startsWith('https://') ? 'wss://' : 'ws://';
  const baseUrl = apiUrl.replace(/^https?:\/\//, '');
  return `${wsProtocol}${baseUrl}${path}`;
};

// Export environment info for debugging
export const ENV_INFO = {
  mode: environment,
  isDevelopment: environment === 'development',
  isProduction: environment === 'production',
  apiUrl: API_BASE_URL,
};

// Log environment info in development
if (ENV_INFO.isDevelopment) {
  console.log('Environment Info:', ENV_INFO);
} 