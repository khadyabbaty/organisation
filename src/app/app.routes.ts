// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';
import { Dashboard } from './components/dashboard/dashboard';
import { Login } from './components/login/login';
import { Register} from './components/register/register';
import { ForgotPassword } from './components/forgot-password/forgot-password';
import { mustBeAuth } from './app/guards/auth-guard';

export const routes: Routes = [
  // --- PUBLIC ---
  {
    path: '',
    children: [
      { path: 'login', component: Login },
      { path: 'register', component: Register },
      { path: 'forgot-password', component: ForgotPassword },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },

  // --- PRIVÉ ---
  {
    path: 'dashboard',
    component: MainLayout,
    canMatch: [mustBeAuth],          // ✅ bloque le segment /dashboard si non-auth
    children: [
      { path: '', component: Dashboard },
      { path: 'projets', loadComponent: () => import('./components/projets/projets').then(m => m.Projets) },
      { path: 'dons', loadComponent: () => import('./components/dons/dons').then(m => m.dons) },
      { path: 'profil', loadComponent: () => import('./components/profil/profil').then(m => m.Profil) },
    ],
  },

  // 404
  { path: '**', redirectTo: 'login' },
];
