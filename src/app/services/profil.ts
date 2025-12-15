import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserProfile {
  id?: string;
  username: string;
  email: string;
  telephone?: string;
  adresse?: string;
  profil?: string;
  roles?: string[];
  profilImageUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<UserProfile> {
    return this.http.get<any>(`${this.baseUrl}/me`).pipe(
      map((me) => {
        const username =
          me?.username ??
          (typeof me?.sub === 'string' ? me.sub.split('@')[0] : '');

        const email =
          me?.email ??
          (typeof me?.sub === 'string' && me.sub.includes('@') ? me.sub : '');

        return {
          id: me?.id,
          username,
          email,
          telephone: me?.telephone ?? '',
          adresse: me?.adresse ?? '',
          profil: me?.profil ?? '',
          roles: Array.isArray(me?.roles) ? me.roles : [],
          profilImageUrl: me?.profilImageUrl ?? me?.avatar ?? me?.photoUrl ?? null
        } as UserProfile;
      })
    );
  }
}
