import 'zone.js'; // ✅ navigateur
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch(err => console.error(err));
function decodeJwt(token: string) {
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch { return null; }
}

if (typeof window !== 'undefined') {
  const raw = localStorage.getItem('access_token') || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
  const claims = decodeJwt(token);
  console.log('[JWT claims]', claims);
}

