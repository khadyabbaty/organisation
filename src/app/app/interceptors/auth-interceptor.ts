import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Injectable({ providedIn: 'root' })
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // 🔑 Récupérer le token
    let token = this.authService.obtenirJeton();

    console.log('[AuthInterceptor] URL:', request.url);
    console.log('[AuthInterceptor] Token brut:', token ? token.substring(0, 30) + '...' : 'NULL');

    if (token) {
      // Retirer un éventuel "Bearer " déjà présent
      if (token.toLowerCase().startsWith('bearer ')) {
        token = token.slice(7);
        console.log('[AuthInterceptor] ⚠️ Token avait "Bearer", retiré');
      }

      const modifiedRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
          // ⚠️ NE PAS ajouter Content-Type ici !
          // Angular le détecte automatiquement (JSON ou FormData)
        }
      });

      console.log('[AuthInterceptor] ✅ Authorization header ajouté');
      console.log('[AuthInterceptor] Headers:', modifiedRequest.headers.keys());

      return next.handle(modifiedRequest).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('[AuthInterceptor] ❌ Erreur:', error.status, error.message);

          // 🔐 Si 401, déconnexion et redirection
          if (error.status === 401) {
            console.error('[AuthInterceptor] ❌ 401 Unauthorized');
            this.authService.deconnexion();
            this.router.navigate(['/login'], { replaceUrl: true });
          }
          return throwError(() => error);
        })
      );
    } else {
      console.log('[AuthInterceptor] ⚠️ Pas de token disponible');
      return next.handle(request);
    }
  }
}
