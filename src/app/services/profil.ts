import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserProfile {
  id?: string;
  username: string;
  email: string;
  telephone?: string;
  adresse?: string;
  profil?: string;
  roles?: string[] | string;
  /** ✅ ajoute cette ligne */
  profilImageUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly base = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<UserProfile> {
    return this.http.get<any>(`${this.base}/me`, { withCredentials: true }).pipe(
      map((me: any) => {
        const sub = me?.sub ?? me?.username ?? '';
        const email = typeof sub === 'string' && sub.includes('@') ? sub : (me?.email ?? '');
        const username = me?.username ?? (typeof sub === 'string' ? sub.split('@')[0] : '');

        return {
          id: me?.id,
          username,
          email,
          telephone: me?.telephone ?? '',
          adresse:   me?.adresse ?? '',
          profil:    me?.profil ?? (Array.isArray(me?.roles) ? me.roles.join(',') : (me?.roles ?? '')),
          roles:     me?.roles,
          /** ✅ mappe l’avatar depuis différents noms possibles côté back */
          profilImageUrl: me?.profilImageUrl ?? me?.avatar ?? me?.photoUrl ?? null
        } as UserProfile;
      })
    );
  }
}
