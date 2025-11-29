// src/environments/environment.preprod.ts (PREPROD)
export const environment = {
  production: true,
  apiUrl: 'https://devbbcom.urssaf.recouv/security-base/api', // URL réelle du SSO URSSAF
  frontUrl: 'https://devbbcom.urssaf.recouv/security-base/',
  enableAutoLogin: false, // Toujours false en production
  devCredentials: null // Pas de credentials en prod
};