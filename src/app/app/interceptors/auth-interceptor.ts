import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private get accessToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem('access_token');
    if (!raw) return null;
    // ✅ Nettoie "Bearer " si déjà présent (ton backend renvoie peut-être le token brut)
    return raw.startsWith('Bearer ') ? raw.slice(7) : raw;
  }

  private get refreshToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('refresh_token');
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // 🔍 DEBUG: Log every request
    console.log('[AuthInterceptor] 🚀 Request URL:', req.url);
    console.log('[AuthInterceptor] 🔑 Token exists?', !!this.accessToken);
    console.log('[AuthInterceptor] 📦 Token value:', this.accessToken?.substring(0, 20) + '...');

    // ✅ Ne pas ajouter Authorization sur les endpoints d'auth
    const isAuthEndpoint =
      req.url.includes('/auth/login') ||
      req.url.includes('/auth/inscription') ||
      req.url.includes(environment.refreshUrl || '/auth/refresh');

    // ✅ Ajoute le token sur toutes les autres requêtes
    const authReq = (!isAuthEndpoint && this.accessToken)
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${this.accessToken}`
          }
        })
      : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        // ✅ Gère le 401 (Unauthorized)
        if (err.status === 401 && !isAuthEndpoint) {

          // Si le refresh n'est pas activé, déconnexion immédiate
          if (!environment.enableRefresh) {
            console.warn('[AuthInterceptor] 401 détecté, refresh désactivé → logout');
            this.signOutAndRedirect();
            return throwError(() => err);
          }

          // Tentative de refresh du token
          if (this.refreshToken) {
            return this.http.post<any>(
              `${environment.apiUrl}${environment.refreshUrl}`,
              { refresh_token: this.refreshToken }
            ).pipe(
              switchMap((res) => {
                const at = res?.token ?? res?.access_token ?? null;
                const rt = res?.refreshToken ?? res?.refresh_token ?? null;

                if (at) localStorage.setItem('access_token', at);
                if (rt) localStorage.setItem('refresh_token', rt);

                // Retry la requête avec le nouveau token
                const newToken = at ? (at.startsWith('Bearer ') ? at.slice(7) : at) : null;
                const retried = newToken
                  ? authReq.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })
                  : authReq;

                return next.handle(retried);
              }),
              catchError(refreshErr => {
                console.error('[AuthInterceptor] Refresh token failed:', refreshErr);
                this.signOutAndRedirect();
                return throwError(() => refreshErr);
              })
            );
          }

          // Pas de refresh_token disponible
          console.warn('[AuthInterceptor] Pas de refresh_token → logout');
          this.signOutAndRedirect();
        }

        return throwError(() => err);
      })
    );
  }

  private signOutAndRedirect() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } catch (e) {
        console.error('[AuthInterceptor] Erreur lors du nettoyage localStorage:', e);
      }
    }
    this.router.navigateByUrl('/login');
  }
}
