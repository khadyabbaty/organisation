import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

export const mustBeAuth: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estAuthentifie()) {
    console.log('✅ [Guard] Accès autorisé');
    return true;
  }

  console.warn('❌ [Guard] Non authentifié → /login');
  return router.createUrlTree(['/login']);
};
export const doitPasEtreAuth: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estAuthentifie()) {
    console.warn('⚠️ [Guard] Déjà connecté → /dashboard');
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
