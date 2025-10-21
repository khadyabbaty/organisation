import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { hasValidToken } from '../app/guards/auth-guard';

export interface RegisterPayload {
  username: string;
  password: string;
  email: string;
  adresse: string;
  telephone: string;
  profil: 'ORGANISATION' | 'ADMIN' | 'DONATEUR' | string;
}
export interface LoginPayload { username: string; password: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl; // ex: http://localhost:8080

  register(payload: RegisterPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/inscription`, payload, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

 login(payload: { username: string; password: string; }) {
  return this.http.post(`${this.baseUrl}/auth/login`, payload, {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  }).pipe(
    tap((res: any) => {
      console.log('[AuthService] 📥 Login response:', res);

      const at = res?.token ?? res?.access_token ?? null;
      const rt = res?.refreshToken ?? res?.refresh_token ?? null;

      console.log('[AuthService] 🔑 Access Token:', at?.substring(0, 20) + '...');
      console.log('[AuthService] 🔄 Refresh Token:', rt?.substring(0, 20) + '...');

      if (at) localStorage.setItem('access_token', at);
      if (rt) localStorage.setItem('refresh_token', rt);

      // Verify it was stored
      console.log('[AuthService] ✅ Token in localStorage:', localStorage.getItem('access_token')?.substring(0, 20) + '...');
    })
  );
}

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Utilise la même logique que le guard
  isAuthenticated(): boolean {
    return hasValidToken();
  }
}
