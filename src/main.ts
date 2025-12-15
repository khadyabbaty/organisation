import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

console.log('[Main] 🚀 Démarrage...');
bootstrapApplication(App, appConfig)
  .catch(err => console.error(err));
