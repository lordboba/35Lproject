# Frontend Deployment Guide

## HTTPS Enforcement in Production

This frontend is configured to automatically enforce HTTPS requests when deployed in production mode. Here's how it works:

### Automatic HTTPS Enforcement

1. **Environment Detection**: The app automatically detects when it's running in production mode (`import.meta.env.MODE === 'production'`)

2. **URL Conversion**: Any HTTP URLs are automatically converted to HTTPS in production

3. **Fallback Protection**: Even if environment variables specify HTTP, the production build will convert them to HTTPS

### Environment Configuration

#### Development
```bash
# .env.local or .env.development
VITE_API_URL=http://localhost:8000
```

#### Production
```bash
# .env.production
VITE_API_URL=https://d11u6fgyzepl0v.cloudfront.net
```

### Build Scripts

- **Development build**: `npm run build:dev` - allows HTTP for local testing
- **Production build**: `npm run build:prod` - enforces HTTPS automatically

### API Request Helpers

The frontend provides secure API request helpers:

```javascript
import { secureApiRequest, createApiUrl, API_BASE_URL } from './config';

// Option 1: Use the secure wrapper (recommended)
const response = await secureApiRequest('/users/initialize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

// Option 2: Use the URL creator with standard fetch
const url = createApiUrl('/users/initialize');
const response = await fetch(url, options);

// Option 3: Use the base URL directly (original method)
const response = await fetch(`${API_BASE_URL}/users/initialize`, options);
```

### Security Features

1. **Automatic HTTPS conversion** in production builds
2. **Runtime warnings** if HTTP is detected in production
3. **Build-time validation** to prevent HTTP URLs in production
4. **WebSocket protocol matching** (HTTP → WS, HTTPS → WSS)

### Deployment Checklist

- [ ] Set `VITE_API_URL` environment variable to your production API endpoint (with HTTPS)
- [ ] Run `npm run build:prod` to create production build
- [ ] Verify console shows "HTTPS" protocol in environment info
- [ ] Test that all API requests use HTTPS in the deployed app

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://your-api.com` |
| `VITE_FIREBASE_API_KEY` | Firebase API key | `your-firebase-key` |

### Troubleshooting

If you see warnings about HTTP in production:
1. Check your `VITE_API_URL` environment variable
2. Ensure you're building with `npm run build:prod`
3. Verify the `MODE` is set to `production` during build
4. Check browser console for security warnings

The app will automatically correct HTTP to HTTPS, but it's better to configure it correctly from the start. 