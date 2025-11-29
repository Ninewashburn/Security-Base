// src/environments/environment.prod.ts (PROD)
export const environment = {
  production: true,
  apiUrl: 'https://bubblecom.urssaf.recouv/security-base/api',
  frontUrl: 'https://bubblecom.urssaf.recouv/security-base/',
  enableAutoLogin: false, // Toujours false en production
  devCredentials: null // Pas de credentials en prod
};