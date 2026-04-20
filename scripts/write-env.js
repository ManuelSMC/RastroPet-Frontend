const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
const configuredApiUrl = process.env.RAILWAY_API_URL || process.env.API_URL || '/api/reports';
const normalizedApiUrl = configuredApiUrl.endsWith('/api/reports')
  ? configuredApiUrl
  : configuredApiUrl.replace(/\/+$/, '') + '/api/reports';

const content = `export const environment = {
  production: true,
  apiUrl: '${normalizedApiUrl}'
};
`;

fs.writeFileSync(targetFile, content, 'utf8');
console.log(`Wrote ${targetFile}`);
