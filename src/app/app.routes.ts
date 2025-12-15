import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';
import { Dashboard } from './components/dashboard/dashboard';
import { Login } from './components/login/login';
import { Register } from './components/register/register';
import { doitPasEtreAuth, mustBeAuth } from './app/guards/auth-guard';

export const routes: Routes = [
  // 🏠 PUBLIQUES
  {
    path: 'login',
    component: Login,
    canMatch: [doitPasEtreAuth],
    title: '🔐 Connexion'
  },
  {
    path: 'register',
    component: Register,
    canMatch: [doitPasEtreAuth],
    title: '📝 Inscription'
  },

  // 🔒 PROTÉGÉES
  {
  path: 'dashboard',
  component: MainLayout,
  canMatch: [mustBeAuth],
  children: [
    { path: '', component: Dashboard },
    { path: 'projets', loadComponent: () => import('./components/projets/projets').then(m => m.Projets) },
    { path: 'dons', loadComponent: () => import('./components/dons/dons').then(m => m.Dons) },
    { path: 'profil', loadComponent: () => import('./components/profil/profil').then(m => m.Profil) },
  ]
},


  // FALLBACK
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
