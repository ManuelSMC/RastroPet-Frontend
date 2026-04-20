const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
const fallbackBackendUrl = 'https://rastropet-backend-production.up.railway.app';
const configuredApiUrl = process.env.RAILWAY_API_URL || process.env.API_URL || fallbackBackendUrl;
const baseApiUrl = /^https?:\/\//i.test(configuredApiUrl) ? configuredApiUrl : fallbackBackendUrl;
const normalizedApiUrl = baseApiUrl.endsWith('/api/reports')
  ? baseApiUrl
  : baseApiUrl.replace(/\/+$/, '') + '/api/reports';

const content = `export const environment = {
  production: true,
  apiUrl: '${normalizedApiUrl}'
};
`;

fs.writeFileSync(targetFile, content, 'utf8');
console.log(`Wrote ${targetFile}`);
