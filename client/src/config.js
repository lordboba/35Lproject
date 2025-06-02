// Configuration for different environments
const config = {
  development: {
    API_BASE_URL: 'http://localhost:8000',
  },
  production: {
    API_BASE_URL: 'https://d11u6fgyzepl0v.cloudfront.net',
  }
};

// Determine current environment
const environment = import.meta.env.MODE || 'development';

// Get API URL with proper fallback logic and HTTPS enforcement
const getApiUrl = () => {
  let url;
  
  // First priority: explicit environment variable
  if (import.meta.env.VITE_API_URL) {
    url = import.meta.env.VITE_API_URL;
    // Force HTTPS in production mode, even if env var specifies HTTP
    if (environment === 'production' && url.startsWith('http://')) {
      console.warn('Converting HTTP to HTTPS for production environment');
      url = url.replace('http://', 'https://');
    }
  }
  // Second priority: environment-specific config
  else if (config[environment]?.API_BASE_URL) {
    url = config[environment].API_BASE_URL;
  }
  // Final fallback: production URL with HTTPS enforcement
  else if (environment === 'production') {
    url = config.production.API_BASE_URL;
  }
  // Development fallback
  else {
    url = config.development.API_BASE_URL;
  }
  
  // Ensure the URL doesn't end with a slash to prevent double slashes when concatenating
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

// Export the configuration for the current environment
export const API_BASE_URL = getApiUrl();

// Generate WebSocket URL from API base URL
export const getWebSocketURL = (path) => {
  const apiUrl = API_BASE_URL;
  const wsProtocol = apiUrl.startsWith('https://') ? 'wss://' : 'ws://';
  const baseUrl = apiUrl.replace(/^https?:\/\//, '');
  
  // Ensure no double slashes in the WebSocket URL
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${wsProtocol}${baseUrl}${cleanPath}`;
};

// Secure API request helper - ensures HTTPS in production
export const createApiUrl = (endpoint) => {
  const baseUrl = API_BASE_URL;
  
  // Ensure no double slashes in the URL
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${cleanEndpoint}`;
  
  // Double-check HTTPS enforcement in production
  if (environment === 'production' && fullUrl.startsWith('http://')) {
    console.error('WARNING: Attempting HTTP request in production, converting to HTTPS');
    return fullUrl.replace('http://', 'https://');
  }
  
  return fullUrl;
};

// Secure fetch wrapper that automatically uses the secure API URL
export const secureApiRequest = async (endpoint, options = {}) => {
  const url = createApiUrl(endpoint);
  
  // Log HTTPS verification in production
  if (environment === 'production' && !url.startsWith('https://')) {
    throw new Error('Production API requests must use HTTPS');
  }
  
  return fetch(url, options);
};

// Export environment info for debugging
export const ENV_INFO = {
  mode: environment,
  isDevelopment: environment === 'development',
  isProduction: environment === 'production',
  apiUrl: API_BASE_URL,
  protocol: API_BASE_URL.startsWith('https://') ? 'HTTPS' : 'HTTP',
  isSecure: API_BASE_URL.startsWith('https://'),
};

// Log environment info in development
if (ENV_INFO.isDevelopment) {
  console.log('Environment Info:', ENV_INFO);
}

// Warn if production is not using HTTPS
if (ENV_INFO.isProduction && !ENV_INFO.isSecure) {
  console.error('WARNING: Production environment is not using HTTPS!');
} 